-- OCR output now lives exclusively in certificates.result (JSONB).

alter table public.certificates
  drop column if exists holder_name,
  drop column if exists certificate_type,
  drop column if exists certificate_id,
  drop column if exists score,
  drop column if exists test_date,
  drop column if exists expiry_date,
  drop column if exists ocr_confidence,
  drop column if exists processing_error;

drop index if exists public.certificates_certificate_id_idx;
drop type if exists public.certificate_type;
