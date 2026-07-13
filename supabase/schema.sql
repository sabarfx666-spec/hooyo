-- Sabar System cloud sync — run this ONCE in Supabase:
-- Dashboard → SQL Editor → New query → paste everything → Run

create table if not exists journal_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table journal_state enable row level security;

drop policy if exists "own journal" on journal_state;
create policy "own journal" on journal_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Chart image cloud storage ──────────────────────────────────
-- Creates a private "charts" bucket; each user can only touch files
-- inside the folder named after their own user id.

insert into storage.buckets (id, name, public)
values ('charts', 'charts', false)
on conflict (id) do nothing;

drop policy if exists "own charts select" on storage.objects;
create policy "own charts select" on storage.objects for select to authenticated
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own charts insert" on storage.objects;
create policy "own charts insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own charts update" on storage.objects;
create policy "own charts update" on storage.objects for update to authenticated
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own charts delete" on storage.objects;
create policy "own charts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Public copies of charts for Notion ─────────────────────────
-- Notion can only display images from a public URL. Charts synced to
-- Notion are published into this public bucket under an unguessable
-- per-user path; only the owner can write there.

insert into storage.buckets (id, name, public)
values ('charts-public', 'charts-public', true)
on conflict (id) do nothing;

drop policy if exists "public charts read" on storage.objects;
create policy "public charts read" on storage.objects for select
  using (bucket_id = 'charts-public');

drop policy if exists "own public charts insert" on storage.objects;
create policy "own public charts insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'charts-public' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own public charts update" on storage.objects;
create policy "own public charts update" on storage.objects for update to authenticated
  using (bucket_id = 'charts-public' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'charts-public' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own public charts delete" on storage.objects;
create policy "own public charts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'charts-public' and (storage.foldername(name))[1] = auth.uid()::text);
