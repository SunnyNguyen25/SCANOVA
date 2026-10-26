-- Keep OCR output as an extensible JSON object instead of fixed database columns.
-- Examples: {"holder_name":"Nguyen Minh Anh","score":7.5,"issuer":"British Council"}

alter table public.certificates
  add column result jsonb not null default '{}'::jsonb
  check (jsonb_typeof(result) = 'object');

create index certificates_result_gin_idx
  on public.certificates using gin (result);
