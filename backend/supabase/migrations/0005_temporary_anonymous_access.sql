-- Development-only anonymous access. Restore owner-based RLS before production.

alter table public.certificates alter column user_id drop not null;

create policy "Temporary anonymous certificate access"
  on public.certificates for all to anon
  using (true)
  with check (true);

create policy "Temporary anonymous certificate uploads"
  on storage.objects for insert to anon
  with check (bucket_id = 'certificate-files');

create policy "Temporary anonymous certificate file reads"
  on storage.objects for select to anon
  using (bucket_id = 'certificate-files');

create policy "Temporary anonymous certificate file deletion"
  on storage.objects for delete to anon
  using (bucket_id = 'certificate-files');
