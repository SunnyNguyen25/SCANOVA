#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_DIR/backend/ocr_service/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

command -v pnpm >/dev/null 2>&1 || {
  echo "pnpm is required. Install it with: corepack enable && corepack prepare pnpm@latest --activate"
  exit 1
}
command -v "$PYTHON_BIN" >/dev/null 2>&1 || {
  echo "Python 3 is required. Set PYTHON_BIN to a Python 3 executable if needed."
  exit 1
}

echo "[1/3] Installing frontend dependencies..."
cd "$PROJECT_DIR"
pnpm install --frozen-lockfile

echo "[2/3] Creating the Python virtual environment..."
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "[3/3] Installing OCR and AI dependencies..."
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r "$PROJECT_DIR/backend/ocr_service/requirements.txt"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo "Created .env. Add GEMINI_API before using AI OCR or AI extraction."
fi

echo "Setup complete. Start the app with: pnpm start"
