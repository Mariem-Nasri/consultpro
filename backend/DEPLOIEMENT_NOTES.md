# Notes de déploiement — module d'analyse audio

## 1. Dépendances Python à ajouter (backend)

```bash
pip install faster-whisper librosa soundfile scipy scikit-learn numpy
```

`faster-whisper` remplace `transformers`+`torch` pour la transcription
(inutile de garder torch si tu ne t'en sers plus ailleurs — ça allège
beaucoup l'empreinte mémoire sur un VPS KVM 2).

## 2. Conversion du modèle whisper-dental-fr-final (À FAIRE UNE SEULE FOIS)

`faster-whisper` a besoin du modèle au format CTranslate2, pas au format
HuggingFace brut. Conversion (en local, ou une fois sur le VPS) :

```bash
pip install ctranslate2 "transformers[torch]"

ct2-transformers-converter \
    --model /chemin/vers/whisper-dental-fr-final \
    --output_dir /chemin/vers/whisper-dental-fr-final-ct2 \
    --quantization int8
```

Puis uploader `whisper-dental-fr-final-ct2/` sur le VPS, par exemple dans
`/var/consultpro/models/`.

## 3. Variables d'environnement (VPS)

```bash
export CONSULTPRO_WHISPER_MODEL_PATH=/var/consultpro/models/whisper-dental-fr-final-ct2
export CONSULTPRO_ASR_DEVICE=cpu
export CONSULTPRO_ASR_COMPUTE_TYPE=int8
export CONSULTPRO_ASR_CPU_THREADS=2
export CONSULTPRO_UPLOAD_DIR=/var/consultpro/uploads
```

A ajouter dans le fichier de service systemd existant (`Environment=...`)
ou dans un `.env` chargé par ton app.

## 4. Vérification rapide après déploiement

```bash
curl -X POST https://ton-domaine/api/analysis/upload -F "file=@test.wav"
# -> {"job_id": "...", "status": "pending"}

curl https://ton-domaine/api/analysis/<job_id>
# -> statut, puis résultat complet une fois "done"
```

## 5. Points d'attention CPU

- Le chargement du modèle prend quelques secondes au démarrage du service
  systemd (normal, c'est voulu — une seule fois, pas par requête).
- Une consultation de ~15 min peut prendre plusieurs minutes à transcrire
  sur 2 vCPU. Le pattern job asynchrone (upload -> poll) gère ça côté
  frontend, mais prévoir d'informer le dentiste que ça prend du temps
  (déjà fait dans `UploadConsultation.jsx`).
- Si plusieurs médecins uploadent en même temps, les jobs s'exécutent en
  file sur le même process (BackgroundTasks est séquentiel dans le même
  worker). Si le volume monte, il faudra une vraie queue (Celery + Redis)
  pour paralléliser — pas nécessaire tant que l'usage reste faible.
