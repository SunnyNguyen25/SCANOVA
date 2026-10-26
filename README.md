# SCANOVA

SCANOVA extracts and stores English certificate data. The production server is a
single FastAPI process that serves the React build and the OCR/AI endpoints on
the same port.

## Project layout

- `frontend/` — React user interface.
- `frontend/components/` — reusable UI components.
- `frontend/lib/` — browser-side API and Supabase helpers.
- `frontend/schemas/ielts-fields.json` — shared IELTS field contract for the UI and AI extractor.
- `backend/ocr_service/` — FastAPI, PaddleOCR, Tesseract, and Gemini/LiteLLM services.
- `Test/` — local input samples; generated OCR output is ignored by Git.

## First-time setup

Install frontend, OCR, and AI dependencies with one command:

macOS/Linux:

```bash
./scripts/setup.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

The script installs pnpm packages, creates `backend/ocr_service/.venv`, installs
`backend/ocr_service/requirements.txt`, and creates `.env` from the template if
needed. It requires `pnpm` and Python 3. Never commit the real `.env` file.

Set `GEMINI_API` in `.env` before using AI OCR or IELTS extraction.

`tesseract` requires a separate system install only when `OCR_ENGINE=tesseract`:

```bash
# macOS
brew install tesseract
```

```powershell
# Windows PowerShell
winget install --id UB-Mannheim.TesseractOCR -e
```

## Commands

```bash
pnpm build     # build the React application
pnpm start     # build and run the single FastAPI application on port 4173
pnpm format    # format frontend source
```

Open `http://localhost:4173` after `pnpm start`.

## OCR engines

Set `OCR_ENGINE` in `.env` to one of `paddle`, `tesseract`, or `ai`.
The `ai` option sends certificate images to Gemini through LiteLLM. IELTS
extraction follows the field list in `frontend/schemas/ielts-fields.json`.
