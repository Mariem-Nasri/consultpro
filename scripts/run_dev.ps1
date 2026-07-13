# run_dev.ps1 — lance tout le projet ConsultPro en local en une commande (Windows PowerShell).
#
# Usage (dans le terminal VS Code, en PowerShell) :
#   .\scripts\run_dev.ps1
#
# A placer dans scripts/ à la racine du repo (au même niveau que backend/ et frontend/).
# Ctrl+C arrête proprement le backend ET le frontend.

$ErrorActionPreference = "Stop"

$RootDir     = Split-Path -Parent $PSScriptRoot
$BackendDir  = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host "==============================================="
Write-Host "  ConsultPro - demarrage environnement local"
Write-Host "==============================================="

# ── 1. Backend : venv + dépendances ───────────────────────────────────
Set-Location $BackendDir

if (-not (Test-Path "venv")) {
    Write-Host "-> Creation du venv Python (3.11 64-bit)..."
    # On force l'utilisation de Python 3.11 64-bit via le launcher "py",
    # pour eviter que Windows utilise un autre Python installe (ex: 3.14-32
    # qui n'a pas pip, ou une version 32-bit incompatible avec certaines libs).
    py -3.11 -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Python 3.11 introuvable via 'py -3.11'."
        Write-Host "Verifie l'installation avec: py -0"
        Write-Host "Ou remplace '-3.11' par '-3.10' dans ce script si tu utilises 3.10."
        exit 1
    }
}

$VenvActivate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"
& $VenvActivate

$DepsMarker = Join-Path $BackendDir "venv\.deps_installed"
if (-not (Test-Path $DepsMarker)) {
    Write-Host "-> Installation des dependances backend..."
    python -m pip install --upgrade pip -q
    python -m pip install fastapi uvicorn python-multipart faster-whisper `
                librosa soundfile scipy scikit-learn numpy -q
    New-Item -ItemType File -Path $DepsMarker | Out-Null
    Write-Host "OK - Dependances backend installees."
} else {
    Write-Host "OK - Dependances backend deja installees (skip)."
}

New-Item -ItemType Directory -Force -Path (Join-Path $BackendDir "uploads") | Out-Null

# ── 2. Variables d'environnement (test local, modèle Whisper public) ──
if (-not $env:CONSULTPRO_WHISPER_MODEL_PATH) { $env:CONSULTPRO_WHISPER_MODEL_PATH = "base" }
if (-not $env:CONSULTPRO_ASR_DEVICE)         { $env:CONSULTPRO_ASR_DEVICE = "cpu" }
if (-not $env:CONSULTPRO_ASR_COMPUTE_TYPE)    { $env:CONSULTPRO_ASR_COMPUTE_TYPE = "int8" }
if (-not $env:CONSULTPRO_ASR_CPU_THREADS)     { $env:CONSULTPRO_ASR_CPU_THREADS = "2" }
if (-not $env:CONSULTPRO_UPLOAD_DIR)          { $env:CONSULTPRO_UPLOAD_DIR = Join-Path $BackendDir "uploads" }

Write-Host ""
Write-Host "Modele Whisper utilise : $env:CONSULTPRO_WHISPER_MODEL_PATH"
Write-Host "(pour utiliser ton modele fine-tune converti, definis la variable"
Write-Host " CONSULTPRO_WHISPER_MODEL_PATH avant de lancer ce script)"
Write-Host ""

# ── 3. Lancer le backend dans une tâche en arrière-plan ───────────────
Write-Host "-> Demarrage du backend FastAPI (http://localhost:8000)..."
$BackendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & "venv\Scripts\Activate.ps1"
    uvicorn app.main:app --reload --port 8000
} -ArgumentList $BackendDir

Start-Sleep -Seconds 3

# ── 4. Frontend : install + run ───────────────────────────────────────
Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Host "-> Installation des dependances frontend (npm install)..."
    npm install
} else {
    Write-Host "OK - Dependances frontend deja installees (skip)."
}

Write-Host "-> Demarrage du frontend Vite (http://localhost:5173)..."
$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $FrontendDir

Write-Host ""
Write-Host "==============================================="
Write-Host "  Backend  : http://localhost:8000"
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  (Ctrl+C pour tout arreter)"
Write-Host "==============================================="

# On relache la contrainte stricte pour cette boucle : les logs d'uvicorn/vite
# arrivent parfois sur le flux d'erreur du job (comportement normal des logs
# Python/Node), et $ErrorActionPreference = "Stop" les transformerait en
# erreurs fatales qui casseraient la boucle immediatement.
$ErrorActionPreference = "Continue"

try {
    while ($true) {
        Receive-Job $BackendJob -ErrorAction SilentlyContinue
        Receive-Job $FrontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Arret en cours..."
    Stop-Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job $BackendJob, $FrontendJob -ErrorAction SilentlyContinue
    Write-Host "OK - Backend et frontend arretes."
}
