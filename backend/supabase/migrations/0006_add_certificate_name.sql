alter table public.certificates
  add column certificate_name text not null default 'Untitled certificate';

alter table public.certificates
  alter column certificate_name drop default;
