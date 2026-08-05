# ConsultPro — Guide de démarrage local

Plateforme d'analyse vocale IA et de coaching praticien pour les consultations dentaires.

## Prérequis

- **Python 3.11 (64-bit)** — installé et accessible via `py -3.11`
- **Node.js** (avec `npm`)
- **PowerShell** (Windows)
- Le modèle Whisper fine-tuné converti au format CTranslate2 (`whisper-dental-fr-final-ct2`), disponible localement — voir [Modèle Whisper](#modèle-whisper) ci-dessous

## Structure du projet

```
consultpro/
├── backend/          # API FastAPI (analyse audio, transcription, scoring)
│   └── venv/         # environnement virtuel Python (créé automatiquement)
├── frontend/         # Interface React/Vite/Tailwind
├── model/            # Modèle Whisper fine-tuné (converti CTranslate2)
└── scripts/
    └── run_dev.ps1   # script de démarrage local (backend + frontend)
```

## Installation & démarrage

### 1. Cloner le projet

```powershell
git clone <url-du-repo> consultpro
cd consultpro
```

### 2. Modèle Whisper

Le backend a besoin du modèle Whisper fine-tuné au format **CTranslate2** (pas le format HuggingFace brut).

- Si tu as déjà le dossier converti (`whisper-dental-fr-final-ct2` contenant `config.json`, `model.bin`, `vocabulary.json`), place-le à l'emplacement suivant :
  ```
  C:\consultpro\model\whisper-dental-fr-final-ct2
  ```
- Si tu ne l'as pas, le script utilisera par défaut le modèle Whisper public `base` (moins précis, mais fonctionnel pour tester rapidement).

> Pour reconvertir le modèle depuis un checkpoint HuggingFace brut, voir la section [Conversion du modèle](#conversion-du-modèle-si-nécessaire).

### 3. Lancer le projet

Depuis la racine du projet (`C:\consultpro`), dans PowerShell :

```powershell
cd C:\consultpro
.\scripts\run_dev.ps1
```

Ce script :
- crée le venv Python et installe les dépendances backend si besoin (première exécution seulement)
- installe les dépendances frontend (`npm install`) si besoin
- lance le **backend FastAPI** sur `http://localhost:8000`
- lance le **frontend Vite** sur `http://localhost:5173`

⚠️ **Première exécution** : si PowerShell refuse d'exécuter le script (erreur "n'est pas signé numériquement"), débloque-le une fois :
```powershell
Unblock-File -Path .\scripts\run_dev.ps1
```

Une fois les deux services démarrés, ouvre **http://localhost:5173** dans le navigateur.

Pour arrêter : `Ctrl+C` dans le terminal, ou ferme les fenêtres ouvertes par le script.

### 4. Utiliser ton propre modèle fine-tuné

Si le modèle n'est pas au chemin par défaut `C:\consultpro\model\whisper-dental-fr-final-ct2`, définis la variable d'environnement avant de lancer le script :

```powershell
$env:CONSULTPRO_WHISPER_MODEL_PATH = "chemin\vers\ton\modele-ct2"
.\scripts\run_dev.ps1
```

## Variables d'environnement (backend)

| Variable | Description | Valeur par défaut (local) |
|---|---|---|
| `CONSULTPRO_WHISPER_MODEL_PATH` | Chemin vers le modèle Whisper (format CTranslate2) ou nom d'un modèle public (`base`, `small`, ...) | `C:\consultpro\model\whisper-dental-fr-final-ct2` |
| `CONSULTPRO_ASR_DEVICE` | Device d'inférence (`cpu` ou `cuda`) | `cpu` |
| `CONSULTPRO_ASR_COMPUTE_TYPE` | Type de calcul (`int8`, `float16`, ...) | `int8` |
| `CONSULTPRO_ASR_CPU_THREADS` | Nombre de threads CPU pour l'inférence | `2` |
| `CONSULTPRO_UPLOAD_DIR` | Dossier de stockage des fichiers audio uploadés | `backend\uploads` |

## Conversion du modèle (si nécessaire)

Si tu pars d'un checkpoint HuggingFace brut (`whisper-dental-fr-final`) et non déjà converti :

```bash
pip install ctranslate2 "transformers[torch]"

ct2-transformers-converter \
    --model /chemin/vers/whisper-dental-fr-final \
    --output_dir /chemin/vers/whisper-dental-fr-final-ct2 \
    --quantization int8
```

Place ensuite le dossier `whisper-dental-fr-final-ct2/` obtenu dans `model/` à la racine du projet.

## Vérification rapide de l'API

```powershell
curl -X POST http://localhost:8000/api/analysis/upload -F "file=@test.wav"
# -> {"job_id": "...", "status": "pending"}

curl http://localhost:8000/api/analysis/<job_id>
# -> statut, puis résultat complet une fois "done"
```

## Points d'attention

- Le chargement du modèle Whisper au démarrage du backend prend plusieurs secondes (normal, une seule fois au lancement).
- Une consultation de ~15 min peut prendre plusieurs minutes à transcrire sur CPU. Le frontend informe l'utilisateur de ce délai (pattern job asynchrone : upload → polling du statut).
- En déploiement (VPS), ces mêmes variables d'environnement sont définies via le service `systemd` plutôt qu'en ligne de commande.
