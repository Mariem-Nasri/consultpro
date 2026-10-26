"""
analysis_router.py
-------------------
Endpoints FastAPI pour l'interface docteur :

  POST /api/analysis/upload      -> upload de l'audio, lance le job en fond, renvoie job_id
  GET  /api/analysis/{job_id}    -> statut du job ("pending" | "processing" | "done" | "error")
                                     + résultat complet (report + coaching) quand done

Store des jobs en mémoire (dict) : OK pour un seul worker Uvicorn.
Si un jour tu passes à plusieurs workers, remplace `_jobs` par Redis ou une table SQL.
"""

import inspect
import os
import shutil
import subprocess
import threading
import traceback
import uuid
from datetime import datetime
from enum import Enum
from time import perf_counter, time

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

from app.services.diarization_service import run_diarization_pipeline
from app.services.coaching_service import generate_coaching
from app.routers.auth_router import require_user
from app.services.database import (
    create_analysis,
    get_analysis_for_user,
    list_analyses_for_user,
    save_analysis_result,
    update_analysis_status,
)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

UPLOAD_DIR = os.environ.get("CONSULTPRO_UPLOAD_DIR", "/var/consultpro/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Nombre de jobs lourds exécutés en même temps (1 = le plus rapide sur un petit VPS)
MAX_PARALLEL_JOBS = int(os.environ.get("CONSULTPRO_MAX_PARALLEL_JOBS", "1"))
_job_slots = threading.Semaphore(MAX_PARALLEL_JOBS)

# Durée de conservation des jobs terminés en mémoire (secondes)
JOB_TTL_SECONDS = int(os.environ.get("CONSULTPRO_JOB_TTL", "3600"))

# Le service accepte-t-il déjà le paramètre `timings` ?
_PIPELINE_ACCEPTS_TIMINGS = (
    "timings" in inspect.signature(run_diarization_pipeline).parameters
)


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


_jobs: dict[str, dict] = {}


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _run_timed_step(
    label: str,
    operation,
    timings: list[tuple[str, float]] | None = None,
):
    started = perf_counter()
    print(f"[{_now()}] [TIMER] {label} started", flush=True)
    try:
        result = operation()
    except Exception:
        elapsed = perf_counter() - started
        print(f"[{_now()}] [TIMER] {label} failed after {elapsed:.2f}s", flush=True)
        if timings is not None:
            timings.append((f"{label} (failed)", elapsed))
        raise
    elapsed = perf_counter() - started
    print(f"[{_now()}] [TIMER] {label} finished in {elapsed:.2f}s", flush=True)
    if timings is not None:
        timings.append((label, elapsed))
    return result


def _print_timing_summary(
    job_id: str,
    timings: list[tuple[str, float]],
    total_seconds: float,
) -> None:
    step_width = max(
        [len("Step"), len("TOTAL"), *(len(label) for label, _ in timings)]
    )
    time_width = max(len("Time (s)"), 10)
    border = f"+{'-' * (step_width + 2)}+{'-' * (time_width + 2)}+"

    print(f"\n[TIMING SUMMARY] Analysis job {job_id}", flush=True)
    print(border, flush=True)
    print(f"| {'Step':<{step_width}} | {'Time (s)':>{time_width}} |", flush=True)
    print(border, flush=True)
    for label, elapsed in timings:
        print(f"| {label:<{step_width}} | {elapsed:>{time_width}.2f} |", flush=True)
    print(border, flush=True)
    print(f"| {'TOTAL':<{step_width}} | {total_seconds:>{time_width}.2f} |", flush=True)
    print(border, flush=True)


def _convert_to_wav_16k_mono(src_path: str) -> str:
    """
    Convertit l'audio en WAV 16 kHz mono (format natif de Whisper/pyannote).
    Si ffmpeg est absent ou échoue, on renvoie le fichier d'origine.
    """
    if shutil.which("ffmpeg") is None:
        print("[WARN] ffmpeg introuvable, conversion ignorée.", flush=True)
        return src_path

    dst_path = os.path.splitext(src_path)[0] + "_16k.wav"
    if os.path.abspath(dst_path) == os.path.abspath(src_path):
        dst_path = os.path.splitext(src_path)[0] + "_16k_converted.wav"

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", src_path,
        "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le",
        dst_path,
    ]
    try:
        subprocess.run(cmd, check=True, timeout=600)
        return dst_path
    except Exception as e:
        print(f"[WARN] Conversion ffmpeg échouée ({e}), fichier d'origine utilisé.", flush=True)
        if os.path.exists(dst_path):
            os.remove(dst_path)
        return src_path


def _purge_old_jobs() -> None:
    cutoff = time() - JOB_TTL_SECONDS
    for jid in [
        j for j, data in _jobs.items()
        if data.get("finished_at") and data["finished_at"] < cutoff
    ]:
        _jobs.pop(jid, None)


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: str | None = None
    result: dict | None = None
    error: str | None = None


def _process_job(job_id: str, audio_path: str):
    job_started = perf_counter()
    timings: list[tuple[str, float]] = []
    converted_path: str | None = None
    user_id = _jobs[job_id]["user_id"]
    print(f"[{_now()}] [TIMER] Analysis job {job_id} started", flush=True)

    try:
        _jobs[job_id]["progress"] = "En file d'attente..."
        with _job_slots:  # un seul job lourd à la fois par défaut
            _jobs[job_id]["status"] = JobStatus.PROCESSING
            update_analysis_status(job_id, JobStatus.PROCESSING.value)

            # 1) Préparation audio
            _jobs[job_id]["progress"] = "Préparation de l'audio..."
            converted_path = _run_timed_step(
                "Audio conversion",
                lambda: _convert_to_wav_16k_mono(audio_path),
                timings,
            )

            # 2) Diarisation + transcription
            _jobs[job_id]["progress"] = "Diarisation et transcription en cours..."
            if _PIPELINE_ACCEPTS_TIMINGS:
                # Le service enregistre lui-même ses sous-étapes
                report = _run_timed_step(
                    "Diarization and transcription",
                    lambda: run_diarization_pipeline(converted_path, timings=timings),
                )
            else:
                report = _run_timed_step(
                    "Diarization and transcription",
                    lambda: run_diarization_pipeline(converted_path),
                    timings,
                )

            # 3) Coaching
            _jobs[job_id]["progress"] = "Calcul du coaching..."
            coaching = _run_timed_step(
                "Coaching generation",
                lambda: generate_coaching(report),
                timings,
            )

        _jobs[job_id]["status"] = JobStatus.DONE
        _jobs[job_id]["progress"] = None
        _jobs[job_id]["result"] = {"report": report, "coaching": coaching}
        save_analysis_result(
            job_id,
            _jobs[job_id]["result"],
            report.get("duration_s"),
            coaching.get("svs", {}).get("global"),
        )

    except Exception as e:
        _jobs[job_id]["status"] = JobStatus.ERROR
        _jobs[job_id]["error"] = str(e)
        update_analysis_status(job_id, JobStatus.ERROR.value, str(e))
        print(f"\n❌ ERREUR pendant le traitement du job {job_id} :")
        traceback.print_exc()
        print()

    finally:
        _jobs[job_id]["finished_at"] = time()
        for path in {audio_path, converted_path}:
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass
        elapsed = perf_counter() - job_started
        print(f"[{_now()}] [TIMER] Analysis job {job_id} finished in {elapsed:.2f}s", flush=True)
        _print_timing_summary(job_id, timings, elapsed)


@router.post("/upload", response_model=JobStatusResponse)
def upload_consultation_audio(  # `def` : exécuté dans un thread, ne bloque pas la boucle async
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_user),
):
    allowed_ext = (".wav", ".mp3", ".mp4", ".m4a", ".ogg")
    filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(400, f"Format non supporté. Formats acceptés : {allowed_ext}")

    _purge_old_jobs()

    job_id = uuid.uuid4().hex
    audio_path = os.path.join(UPLOAD_DIR, f"{job_id}{ext}")

    with open(audio_path, "wb") as f:
        shutil.copyfileobj(file.file, f, length=1024 * 1024)  # blocs de 1 Mo

    _jobs[job_id] = {
        "status": JobStatus.PENDING,
        "progress": None,
        "result": None,
        "error": None,
        "finished_at": None,
        "user_id": user["id"],
    }
    create_analysis(job_id, user["id"], _now())
    background_tasks.add_task(_process_job, job_id, audio_path)

    return JobStatusResponse(job_id=job_id, status=JobStatus.PENDING)


@router.get("/history")
def get_analysis_history(user: dict = Depends(require_user)):
    return list_analyses_for_user(user["id"])


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_analysis_status(job_id: str, user: dict = Depends(require_user)):
    job = _jobs.get(job_id)
    if job is not None and job.get("user_id") != user["id"]:
        raise HTTPException(404, "Analyse introuvable.")

    stored = get_analysis_for_user(job_id, user["id"])
    if job is None and stored is None:
        raise HTTPException(404, "Job introuvable.")

    if job is None:
        return JobStatusResponse(
            job_id=job_id,
            status=stored["status"],
            progress=None,
            result=stored["result"],
            error=stored["error"],
        )

    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        result=job.get("result"),
        error=job.get("error"),
    )