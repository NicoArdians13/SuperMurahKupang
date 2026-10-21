-- Tambahan khusus artikel & promo. Jalankan sekali di SQL Editor Supabase.
-- Tidak mengubah tabel, storage, policy, atau data lama.
-- Menggunakan admin_users(id, role) yang sudah dipakai login aplikasi.
begin;
create table if not exists public.storefront_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('article', 'promo')),
  title text not null check (length(trim(title)) between 1 and 180),
  summary text not null default '',
  body text not null check (length(trim(body)) > 0),
  image_url text not null default '',
  starts_on date,
  ends_on date,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storefront_content_dates check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
alter table public.storefront_content enable row level security;
grant select on public.storefront_content to anon, authenticated;
grant insert, update, delete on public.storefront_content to authenticated;
create index if not exists storefront_content_published_idx on public.storefront_content (published, created_at desc);
-- Buat policy baru hanya bila belum ada. Tidak mengganti policy existing.
do $$ begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='storefront_content' and policyname='storefront_public_read') then
  create policy storefront_public_read on public.storefront_content for select to anon, authenticated using (published = true);
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='storefront_content' and policyname='storefront_admin_manage') then
  create policy storefront_admin_manage on public.storefront_content for all to authenticated
  using (exists (select 1 from public.admin_users where id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.admin_users where id = (select auth.uid()) and role = 'admin'));
 end if;
end $$;
commit;
