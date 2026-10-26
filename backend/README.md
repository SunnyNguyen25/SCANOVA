# SCANOVA backend

The backend follows Clean Architecture. Supabase is an infrastructure concern:
domain and application code expose repository contracts, while adapters in
`src/infrastructure` implement those contracts using Supabase.

## Database

The first schema migration is in `supabase/migrations/0001_initial_schema.sql`.
It defines one `certificates` table: every certificate belongs directly to an
authenticated user. Apart from processing metadata and the source file path,
all OCR data is stored in its extensible `result` JSONB field, so new extracted
fields do not require database migrations. Copy `.env.example` to `.env` and
provide the Supabase project URL and keys when the API server is configured.

Use the service-role key only in the backend. It must never be exposed to the
React client.

## OCR service

PaddleOCR runs as a separate Python API because it cannot run in the browser.
From `backend/ocr_service`, create a virtual environment, install
`requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
