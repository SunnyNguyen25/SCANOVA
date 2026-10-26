$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$VenvDir = Join-Path $ProjectDir "backend\ocr_service\.venv"
$Python = Get-Command py -ErrorAction SilentlyContinue
if ($null -eq $Python) {
  $Python = Get-Command python -ErrorAction SilentlyContinue
}
if ($null -eq $Python) {
  throw "Python 3 is required. Install it from https://www.python.org/downloads/windows/"
}
if ($null -eq (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm is required. Run: corepack enable; corepack prepare pnpm@latest --activate"
}

Set-Location $ProjectDir
Write-Host "[1/3] Installing frontend dependencies..."
pnpm install --frozen-lockfile

Write-Host "[2/3] Creating the Python virtual environment..."
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
  if ($Python.Name -eq "py.exe") {
    & py -3 -m venv $VenvDir
  } else {
    & python -m venv $VenvDir
  }
}

Write-Host "[3/3] Installing OCR and AI dependencies..."
& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $ProjectDir "backend\ocr_service\requirements.txt")

$EnvFile = Join-Path $ProjectDir ".env"
if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $ProjectDir ".env.example") $EnvFile
  Write-Host "Created .env. Add GEMINI_API before using AI OCR or AI extraction."
}

Write-Host "Setup complete. Start the app with: pnpm start"
