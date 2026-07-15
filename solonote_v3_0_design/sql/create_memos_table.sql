-- SoloNote v3.0 Supabase memos table draft

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  category text not null default '업무',
  project text not null default '',
  is_important boolean not null default false,
  is_deleted boolean not null default false,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memos enable row level security;

create policy "Users can read own memos"
on public.memos
for select
using (auth.uid() = user_id);

create policy "Users can insert own memos"
on public.memos
for insert
with check (auth.uid() = user_id);

create policy "Users can update own memos"
on public.memos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own memos"
on public.memos
for delete
using (auth.uid() = user_id);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_memos_updated_at on public.memos;

create trigger update_memos_updated_at
before update on public.memos
for each row
execute function public.update_updated_at_column();
