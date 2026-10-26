-- SCANOVA personal-certificate schema.
-- Each certificate belongs directly to one authenticated user.

create type public.certificate_type as enum ('ielts', 'toefl', 'toeic', 'other');
create type public.certificate_status as enum (
  'uploaded',
  'processing',
  'completed',
  'needs_review',
  'failed'
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holder_name text,
  certificate_type public.certificate_type not null default 'other',
  certificate_id text,
  score text,
  test_date date,
  expiry_date date,
  source_file_path text not null,
  ocr_confidence numeric(5, 2) check (ocr_confidence between 0 and 100),
  status public.certificate_status not null default 'uploaded',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certificates_user_id_created_at_idx
  on public.certificates (user_id, created_at desc);
create index certificates_certificate_id_idx
  on public.certificates (certificate_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_certificates_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;

create policy "Users can view their certificates"
  on public.certificates for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their certificates"
  on public.certificates for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their certificates"
  on public.certificates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their certificates"
  on public.certificates for delete to authenticated
  using ((select auth.uid()) = user_id);
