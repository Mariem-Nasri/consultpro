"""
analysis_router.py
-------------------
Endpoints FastAPI pour l'interface docteur :

  POST /api/analysis/upload      -> upload de l'audio, lance le job en fond, renvoie job_id
  GET  /api/analysis/{job_id}    -> statut du job ("pending" | "processing" | "done" | "error")
                                     + résultat complet (report + coaching) quand done

Store des jobs en mémoire (dict) : OK pour un seul worker Uvicorn (cas
standard sur un VPS KVM 2 avec des ressources limitées). Si un jour tu passes
à plusieurs workers, remplace `_jobs` par Redis ou une table SQL.
"""

import os
import shutil
import uuid
from enum import Enum
import traceback


from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.services.diarization_service import run_diarization_pipeline
from app.services.coaching_service import generate_coaching

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

UPLOAD_DIR = os.environ.get("CONSULTPRO_UPLOAD_DIR", "/var/consultpro/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


_jobs: dict[str, dict] = {}


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: str | None = None
    result: dict | None = None
    error: str | None = None


def _process_job(job_id: str, audio_path: str):
    try:
        _jobs[job_id]["status"] = JobStatus.PROCESSING
        _jobs[job_id]["progress"] = "Diarisation et transcription en cours..."

        report = run_diarization_pipeline(audio_path)

        _jobs[job_id]["progress"] = "Calcul du coaching..."
        coaching = generate_coaching(report)

        _jobs[job_id]["status"] = JobStatus.DONE
        _jobs[job_id]["result"] = {"report": report, "coaching": coaching}
    except Exception as e:
        _jobs[job_id]["status"] = JobStatus.ERROR
        _jobs[job_id]["error"] = str(e)
        print(f"\n❌ ERREUR pendant le traitement du job {job_id} :")
        traceback.print_exc()
        print()
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


@router.post("/upload", response_model=JobStatusResponse)
async def upload_consultation_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    allowed_ext = (".wav", ".mp3", ".mp4", ".m4a", ".ogg")
    if not file.filename.lower().endswith(allowed_ext):
        raise HTTPException(400, f"Format non supporté. Formats acceptés : {allowed_ext}")

    job_id = uuid.uuid4().hex
    audio_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")

    with open(audio_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    _jobs[job_id] = {"status": JobStatus.PENDING, "progress": None, "result": None, "error": None}
    background_tasks.add_task(_process_job, job_id, audio_path)

    return JobStatusResponse(job_id=job_id, status=JobStatus.PENDING)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_analysis_status(job_id: str):
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "Job introuvable.")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        result=job.get("result"),
        error=job.get("error"),
    )
