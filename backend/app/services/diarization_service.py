"""
diarization_service.py
-----------------------
Portage du notebook `diarisation_hybrid_versionF.ipynb` en module Python
appelable depuis le backend FastAPI (au lieu d'un notebook Colab).

Différences par rapport au notebook :
- Plus de Google Drive / Colab : chemins passés en paramètres.
- Transcription via `faster-whisper` (CTranslate2) plutôt que `transformers` :
  bien plus rapide sur CPU, ce qui est le cas de figure sur un VPS Hostinger
  KVM (pas de GPU). Voir load_asr_model() plus bas.
- Le modèle est chargé UNE SEULE FOIS au démarrage du serveur (voir main.py
  -> lifespan), pas à chaque requête.
- Retourne un dict Python (équivalent de report.json) au lieu d'écrire des
  fichiers de rapport.

IMPORTANT — conversion du modèle :
`whisper-dental-fr-final` est un modèle HuggingFace fine-tuné. Pour l'utiliser
avec faster-whisper, il doit d'abord être converti au format CTranslate2 :

    pip install ctranslate2 transformers[torch]
    ct2-transformers-converter \\
        --model /chemin/vers/whisper-dental-fr-final \\
        --output_dir /chemin/vers/whisper-dental-fr-final-ct2 \\
        --quantization int8

Cette conversion se fait UNE FOIS (en local ou sur le VPS), pas à chaque
déploiement. C'est `whisper-dental-fr-final-ct2` qu'on charge ensuite ici.
"""

import os
import re
import uuid
import warnings

import numpy as np
import librosa
import soundfile as sf
from scipy.ndimage import median_filter
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import AgglomerativeClustering

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────
# Paramètres (identiques au notebook)
# ─────────────────────────────────────────────────────────────────────
TARGET_SR = 16000
SILENCE_THRESHOLD_DB = -40
MIN_SILENCE_MS = 400
MIN_SEGMENT_MS = 800
N_MFCC = 40
N_MELS = 80
N_SPEAKERS = 2
MERGE_GAP_MS = 1500

KEYWORDS_DOCTOR = [
    r"\border\w*nance\b", r"\bprescrire\b", r"\bprescris\b", r"\bprescription\b",
    r"\bdiagnostic\b", r"\btraitement\b", r"\bexamen\b", r"\bradiographie\b",
    r"\banalyse\b", r"\bdosage\b", r"\bantibiotique\b", r"\bconsultation\b",
    r"\btenez\b", r"\brespirer\b", r"\bauscult\w+\b", r"\bpression artérielle\b",
    r"\bje vous (conseille|recommande|prescris|propose)\b",
    r"\bvous devez\b", r"\bfaut (faire|prendre|consulter)\b",
]
KEYWORDS_PATIENT = [
    r"\bj'ai mal\b", r"\bça fait mal\b", r"\bdepuis (hier|ce matin|lundi|une semaine)\b",
    r"\bj'ai (de la fièvre|de la toux|du mal|des douleurs|des nausées)\b",
    r"\bje me sens\b", r"\bje souffre\b", r"\bje dors mal\b",
    r"\bmon (médecin|docteur|généraliste)\b",
    r"\bc'est (grave|normal|inquiétant)\b",
    r"\bqu'est-ce que j'ai\b",
]


# ─────────────────────────────────────────────────────────────────────
# Chargement du modèle Whisper (une seule fois, au démarrage du serveur)
# ─────────────────────────────────────────────────────────────────────
_asr_model = None


def load_asr_model(model_path: str, device: str = "cpu", compute_type: str = "int8", cpu_threads: int = 0):
    """
    A appeler UNE FOIS au démarrage de FastAPI (voir main.py -> lifespan).

    :param model_path: chemin vers le modèle converti au format CTranslate2
                        (voir docstring du module pour la commande de conversion)
    :param device: "cpu" sur un VPS Hostinger KVM sans GPU
    :param compute_type: "int8" = bon compromis vitesse/précision sur CPU
    :param cpu_threads: 0 = laisse CTranslate2 déterminer automatiquement
                         (sinon fixer au nb de vCPU du VPS, ex: 2)
    """
    global _asr_model
    if _asr_model is not None:
        return _asr_model

    from faster_whisper import WhisperModel

    _asr_model = WhisperModel(
        model_path,
        device=device,
        compute_type=compute_type,
        cpu_threads=cpu_threads,
    )
    return _asr_model


def _transcribe(wav_path: str) -> str:
    if _asr_model is None:
        raise RuntimeError("Modèle ASR non chargé — appelle load_asr_model() au démarrage.")
    segments, _info = _asr_model.transcribe(wav_path, language="fr", beam_size=1)
    return " ".join(seg.text.strip() for seg in segments).strip()


# ─────────────────────────────────────────────────────────────────────
# Segmentation par silence
# ─────────────────────────────────────────────────────────────────────
def _segment_by_silence(y, sr, threshold_db, min_silence_ms, min_segment_ms):
    hop_ms = 20
    hop_len = int(sr * hop_ms / 1000)
    frame_len = hop_len * 2

    rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop_len)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    is_speech = rms_db > threshold_db

    min_sil_frames = max(1, int(min_silence_ms / hop_ms))
    is_speech = median_filter(is_speech.astype(float), size=min_sil_frames) > 0.5

    segments, in_seg, seg_start = [], False, 0
    for i, speech in enumerate(is_speech):
        if speech and not in_seg:
            seg_start, in_seg = i, True
        elif not speech and in_seg:
            start_s, end_s = seg_start * hop_len, i * hop_len
            if (end_s - start_s) / sr * 1000 >= min_segment_ms:
                segments.append((start_s, min(end_s, len(y))))
            in_seg = False
    if in_seg:
        start_s, end_s = seg_start * hop_len, len(y)
        if (end_s - start_s) / sr * 1000 >= min_segment_ms:
            segments.append((start_s, end_s))
    return segments


def _compute_segment_embedding(y_seg, sr, n_mfcc=40, n_mels=80):
    hop = 160
    if len(y_seg) < hop * 4:
        return None

    mfcc = librosa.feature.mfcc(y=y_seg, sr=sr, n_mfcc=n_mfcc, n_mels=n_mels, hop_length=hop, n_fft=512)
    d1 = librosa.feature.delta(mfcc)

    try:
        f0, _, _ = librosa.pyin(
            y_seg, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C6"),
            sr=sr, hop_length=hop, frame_length=512,
        )
        f0 = np.nan_to_num(f0, nan=0.0)
        voiced = f0[f0 > 0]
        f0_mean, f0_std = (voiced.mean(), voiced.std()) if len(voiced) > 1 else (0.0, 0.0)
        f0_med = np.median(voiced) if len(voiced) > 0 else 0.0
        voiced_ratio = (f0 > 0).mean()
    except Exception:
        f0_mean = f0_std = f0_med = voiced_ratio = 0.0

    rms = librosa.feature.rms(y=y_seg, hop_length=hop)[0]
    log_e = np.log(rms + 1e-10)

    return np.concatenate([
        mfcc.mean(1), mfcc.std(1),
        d1.mean(1), d1.std(1),
        [f0_mean, f0_std, f0_med, voiced_ratio],
        [log_e.mean(), log_e.std()],
    ])


def _cluster_embeddings(embs, n_spk):
    X = StandardScaler().fit_transform(embs)
    n_comp = min(30, X.shape[1], len(X) - 1)
    X_pca = PCA(n_components=n_comp).fit_transform(X)
    labels = AgglomerativeClustering(n_clusters=n_spk, linkage="ward").fit_predict(X_pca)
    return labels


def _merge_consecutive(segments, merge_gap_ms):
    if not segments:
        return []
    merged = [segments[0].copy()]
    for seg in segments[1:]:
        prev = merged[-1]
        if prev["speaker_id"] == seg["speaker_id"] and seg["start_ms"] - prev["end_ms"] <= merge_gap_ms:
            prev["end_ms"] = seg["end_ms"]
            prev["duration_ms"] = prev["end_ms"] - prev["start_ms"]
        else:
            merged.append(seg.copy())
    return merged


def _keyword_score(text, patterns):
    text_low = text.lower()
    return sum(1 for p in patterns if re.search(p, text_low))


def _question_score(text):
    return text.count("?") + len(re.findall(
        r"\b(depuis quand|où avez-vous|est-ce que vous|avez-vous|comment allez|"
        r"avez-vous pris|est-ce que ça|qu'est-ce qui|pouvez-vous)\b",
        text.lower(),
    ))


def _identify_roles(segments):
    scores = {"SPEAKER_0": {"doctor": 0, "patient": 0},
              "SPEAKER_1": {"doctor": 0, "patient": 0}}
    for seg in segments:
        spk, text = seg["speaker_id"], seg.get("text", "")
        if not text.strip():
            continue
        scores[spk]["doctor"] += _keyword_score(text, KEYWORDS_DOCTOR)
        scores[spk]["patient"] += _keyword_score(text, KEYWORDS_PATIENT)
        scores[spk]["doctor"] += _question_score(text) * 0.5

    for spk in ["SPEAKER_0", "SPEAKER_1"]:
        ss = [s for s in segments if s["speaker_id"] == spk]
        avg = np.mean([s["duration_ms"] for s in ss]) if ss else 0
        scores[spk]["doctor"] += avg / 5000

    net_0 = scores["SPEAKER_0"]["doctor"] - scores["SPEAKER_0"]["patient"]
    net_1 = scores["SPEAKER_1"]["doctor"] - scores["SPEAKER_1"]["patient"]

    if net_0 >= net_1:
        role_map = {"SPEAKER_0": "Médecin", "SPEAKER_1": "Patient"}
    else:
        role_map = {"SPEAKER_0": "Patient", "SPEAKER_1": "Médecin"}
    return role_map


# ─────────────────────────────────────────────────────────────────────
# Fonction principale — équivalent de tout le notebook 1
# ─────────────────────────────────────────────────────────────────────
def run_diarization_pipeline(audio_path: str, work_dir: str | None = None) -> dict:
    """
    Prend un fichier audio uploadé par le dentiste, exécute tout le pipeline
    du notebook 1, et retourne un dict équivalent à `report.json`.
    """
    if work_dir is None:
        work_dir = f"/tmp/consultpro_{uuid.uuid4().hex}"
    os.makedirs(work_dir, exist_ok=True)

    audio_data, sr = librosa.load(audio_path, sr=TARGET_SR, mono=True)
    duration = librosa.get_duration(y=audio_data, sr=sr)

    speech_segments = _segment_by_silence(
        audio_data, sr, SILENCE_THRESHOLD_DB, MIN_SILENCE_MS, MIN_SEGMENT_MS
    )
    if len(speech_segments) < 4:
        raise ValueError("Pas assez de parole détectée dans l'audio — vérifier le fichier.")

    embeddings, valid_segs = [], []
    for start_s, end_s in speech_segments:
        emb = _compute_segment_embedding(audio_data[start_s:end_s], sr, N_MFCC, N_MELS)
        if emb is not None:
            embeddings.append(emb)
            valid_segs.append((start_s, end_s))
    embeddings = np.array(embeddings)

    seg_labels = _cluster_embeddings(embeddings, N_SPEAKERS)

    raw_segs = [{
        "speaker_id": f"SPEAKER_{lbl}",
        "start_ms": int(s / sr * 1000),
        "end_ms": int(e / sr * 1000),
        "duration_ms": int((e - s) / sr * 1000),
    } for lbl, (s, e) in zip(seg_labels, valid_segs)]

    segments = _merge_consecutive(raw_segs, MERGE_GAP_MS)

    # Export wav + transcription
    for i, seg in enumerate(segments):
        ss = int(seg["start_ms"] / 1000 * sr)
        es = int(seg["end_ms"] / 1000 * sr)
        chunk = audio_data[ss:es]
        if len(chunk) == 0:
            seg["text"] = ""
            continue
        wav_path = os.path.join(work_dir, f"{i+1:04d}_{seg['speaker_id']}.wav")
        sf.write(wav_path, chunk, sr)
        try:
            seg["text"] = _transcribe(wav_path)
        except Exception:
            seg["text"] = ""
        finally:
            os.remove(wav_path)

    if any(s.get("text", "").strip() for s in segments):
        role_map = _identify_roles(segments)
    else:
        role_map = {"SPEAKER_0": "SPEAKER_0", "SPEAKER_1": "SPEAKER_1"}

    for seg in segments:
        seg["speaker"] = role_map.get(seg["speaker_id"], seg["speaker_id"])

    return {
        "file": os.path.basename(audio_path),
        "duration_s": duration,
        "n_speakers": N_SPEAKERS,
        "n_segments": len(segments),
        "role_map": role_map,
        "segments": segments,
    }
