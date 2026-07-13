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
