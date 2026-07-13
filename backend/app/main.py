"""
main.py
-------
Squelette d'entrée FastAPI montrant comment brancher le nouveau router
d'analyse ET charger le modèle Whisper une seule fois au démarrage.

⚠️ Ceci est un exemple minimal à FUSIONNER avec ton main.py existant
(qui a déjà /api/health, /api/sessions, /api/coaching/{session_id}, JWT...).
Ne remplace pas ton fichier — copie juste les parties `lifespan` et
`app.include_router(...)`.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.diarization_service import load_asr_model
from app.routers.analysis_router import router as analysis_router

# ── Config modèle (à ajuster selon ton chemin réel sur le VPS) ────────────
MODEL_PATH = os.environ.get(
    "CONSULTPRO_WHISPER_MODEL_PATH",
    "/var/consultpro/models/whisper-dental-fr-final-ct2",  # modèle converti CTranslate2
)
ASR_DEVICE = os.environ.get("CONSULTPRO_ASR_DEVICE", "cpu")       # "cpu" sur ton VPS KVM 2
ASR_COMPUTE_TYPE = os.environ.get("CONSULTPRO_ASR_COMPUTE_TYPE", "int8")
ASR_CPU_THREADS = int(os.environ.get("CONSULTPRO_ASR_CPU_THREADS", "2"))  # = nb vCPU du VPS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup : charger le modèle Whisper UNE SEULE FOIS ────────────────
    print(f"⏳ Chargement du modèle Whisper depuis {MODEL_PATH} (device={ASR_DEVICE})...")
    load_asr_model(
        MODEL_PATH,
        device=ASR_DEVICE,
        compute_type=ASR_COMPUTE_TYPE,
        cpu_threads=ASR_CPU_THREADS,
    )
    print("✅ Modèle Whisper chargé.")
    yield
    # ── Shutdown : rien de spécial à nettoyer ici ─────────────────────────


app = FastAPI(title="ConsultPro API", lifespan=lifespan)

# CORS — adapte l'origine à ton frontend Vite déployé
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://consult-pro-praticien.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers existants (à garder tels quels dans ton vrai main.py) ────────
# app.include_router(sessions_router)
# app.include_router(coaching_router)
# app.include_router(auth_router)

# ── Nouveau router d'analyse audio ─────────────────────────────────────
app.include_router(analysis_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
