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

MODIF (intégration coaching praticien — phonétique/diction) :
- `_compute_segment_embedding` retourne maintenant un tuple
  (embedding, features) au lieu d'un simple vecteur. `features` contient
  pitch_std et energy_mean, déjà calculés pour le clustering mais jusque-là
  jetés après usage.
- Chaque segment du report final porte désormais :
    - "pitch_std"             : variation du ton (voix monotone / tremblante)
    - "energy_mean"           : intensité vocale moyenne (log-énergie)
    - "debit_mots_par_sec"    : débit de parole, calculé après transcription
  Ces trois champs alimentent coaching_service.py pour couvrir l'axe
  "phonétique et diction" du cahier des charges (débit, articulation
  indirecte via variation de ton), qui n'était pas exposé auparavant.
- `_merge_consecutive` moyenne pitch_std/energy_mean au prorata de la durée
  quand deux segments consécutifs du même locuteur sont fusionnés, au lieu
  de garder arbitrairement les valeurs du premier segment.

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


def load_asr_model(model_path: str, device: str = "cuda", compute_type: str = "float16", cpu_threads: int = 0):
    """
    Charge le modèle Whisper en priorité sur GPU, avec fallback CPU si nécessaire.
    Cela évite de rester bloqué sur un environnement sans CUDA alors que le PC
    a bien une carte graphique disponible.
    """
    global _asr_model
    if _asr_model is not None:
        return _asr_model

    from faster_whisper import WhisperModel

    candidate_devices = [device] if device else ["cuda", "cpu"]
    if "cuda" not in candidate_devices and "auto" not in candidate_devices and "cpu" not in candidate_devices:
        candidate_devices = [device, "cuda", "cpu"]
    elif "auto" in candidate_devices:
        candidate_devices = ["cuda", "cpu"]

    last_error = None
    for candidate in candidate_devices:
        try:
            _asr_model = WhisperModel(
                model_path,
                device=candidate,
                compute_type=compute_type if candidate == "cuda" else (compute_type if compute_type in {"int8", "float16"} else "int8"),
                cpu_threads=cpu_threads if candidate == "cpu" else 0,
            )
            print(f"✅ WhisperModel chargé sur device={candidate} (compute_type={compute_type})")
            return _asr_model
        except Exception as exc:  # pragma: no cover - dépend de l'environnement GPU/CPU
            last_error = exc
            print(f"⚠️ Chargement Whisper sur {candidate} impossible : {exc}")

    raise RuntimeError(f"Impossible de charger le modèle Whisper sur {candidate_devices}.") from last_error


def _transcribe(wav_path: str) -> str:
    if _asr_model is None:
        raise RuntimeError("Modèle ASR non chargé — appelle load_asr_model() au démarrage.")
    segments, _info = _asr_model.transcribe(wav_path, language="fr", beam_size=1, vad_filter=True)
    return " ".join(seg.text.strip() for seg in segments).strip()


def _transcribe_full_audio(audio_path: str) -> list[dict]:
    """Transcrit tout le fichier une seule fois et renvoie les segments de temps."""
    if _asr_model is None:
        raise RuntimeError("Modèle ASR non chargé — appelle load_asr_model() au démarrage.")

    segments, _info = _asr_model.transcribe(
        audio_path,
        language="fr",
        beam_size=1,
        vad_filter=True,
        word_timestamps=False,
    )

    result = []
    for seg in segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        result.append({
            "start": float(seg.start),
            "end": float(seg.end),
            "text": text,
        })
    return result


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
    """
    Retourne (embedding, features) :
    - embedding : vecteur utilisé pour le clustering (inchangé)
    - features  : dict avec pitch_std et energy_mean, exposés pour le
                  coaching praticien (axe phonétique/diction).
      Retourne (None, None) si le segment est trop court.
    """
    hop = 160
    if len(y_seg) < hop * 4:
        return None, None

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

    embedding = np.concatenate([
        mfcc.mean(1), mfcc.std(1),
        d1.mean(1), d1.std(1),
        [f0_mean, f0_std, f0_med, voiced_ratio],
        [log_e.mean(), log_e.std()],
    ])

    features = {
        "pitch_std": float(f0_std),
        "energy_mean": float(log_e.mean()),
    }

    return embedding, features


def _cluster_embeddings(embs, n_spk):
    X = StandardScaler().fit_transform(embs)
    n_comp = min(30, X.shape[1], len(X) - 1)
    X_pca = PCA(n_components=n_comp).fit_transform(X)
    labels = AgglomerativeClustering(n_clusters=n_spk, linkage="ward").fit_predict(X_pca)
    return labels


def _merge_consecutive(segments, merge_gap_ms):
    """
    Fusionne les segments consécutifs du même locuteur. Pour pitch_std et
    energy_mean, moyenne pondérée par la durée plutôt que de garder
    arbitrairement les valeurs du premier segment de la fusion.
    """
    if not segments:
        return []
    merged = [segments[0].copy()]
    for seg in segments[1:]:
        prev = merged[-1]
        if prev["speaker_id"] == seg["speaker_id"] and seg["start_ms"] - prev["end_ms"] <= merge_gap_ms:
            prev_dur = prev["duration_ms"]
            seg_dur = seg["duration_ms"]
            total_dur = prev_dur + seg_dur
            if total_dur > 0:
                for key in ("pitch_std", "energy_mean"):
                    if key in prev and key in seg:
                        prev[key] = (prev[key] * prev_dur + seg[key] * seg_dur) / total_dur
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

    embeddings, valid_segs, seg_features = [], [], []
    for start_s, end_s in speech_segments:
        emb, feats = _compute_segment_embedding(audio_data[start_s:end_s], sr, N_MFCC, N_MELS)
        if emb is not None:
            embeddings.append(emb)
            valid_segs.append((start_s, end_s))
            seg_features.append(feats)
    embeddings = np.array(embeddings)

    seg_labels = _cluster_embeddings(embeddings, N_SPEAKERS)

    raw_segs = [{
        "speaker_id": f"SPEAKER_{lbl}",
        "start_ms": int(s / sr * 1000),
        "end_ms": int(e / sr * 1000),
        "duration_ms": int((e - s) / sr * 1000),
        "pitch_std": feats["pitch_std"],
        "energy_mean": feats["energy_mean"],
    } for lbl, (s, e), feats in zip(seg_labels, valid_segs, seg_features)]

    segments = _merge_consecutive(raw_segs, MERGE_GAP_MS)

    # On évite la transcription segment par segment qui est très coûteuse sur CPU.
    # On transcrit le fichier entier une seule fois, puis on répartit le texte sur
    # les segments de parole selon leur recouvrement temporel.
    full_transcript = []
    try:
        full_transcript = _transcribe_full_audio(audio_path)
    except Exception:
        full_transcript = []

    for seg in segments:
        seg_start = seg["start_ms"] / 1000.0
        seg_end = seg["end_ms"] / 1000.0
        seg_text_parts = []

        if full_transcript:
            for chunk in full_transcript:
                chunk_start = float(chunk["start"])
                chunk_end = float(chunk["end"])
                overlap = max(0.0, min(seg_end, chunk_end) - max(seg_start, chunk_start))
                if overlap > 0.0:
                    seg_text_parts.append(chunk["text"])
            seg["text"] = " ".join(seg_text_parts).strip()
        else:
            seg["text"] = ""

        if not seg["text"]:
            # Fallback conservateur : transcription de la zone localisée, uniquement si
            # le transcript global n'a rien donné pour ce segment.
            ss = int(seg["start_ms"] / 1000 * sr)
            es = int(seg["end_ms"] / 1000 * sr)
            chunk = audio_data[ss:es]
            if len(chunk) == 0:
                seg["text"] = ""
            else:
                wav_path = os.path.join(work_dir, f"tmp_{uuid.uuid4().hex}.wav")
                sf.write(wav_path, chunk, sr)
                try:
                    seg["text"] = _transcribe(wav_path)
                except Exception:
                    seg["text"] = ""
                finally:
                    if os.path.exists(wav_path):
                        os.remove(wav_path)

        n_words = len(seg["text"].split())
        seg["debit_mots_par_sec"] = (
            round(n_words / (seg["duration_ms"] / 1000), 2) if seg["duration_ms"] > 0 else 0.0
        )

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