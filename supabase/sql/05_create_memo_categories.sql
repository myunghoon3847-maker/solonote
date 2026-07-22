-- 훈노트 v4.5 사용자 카테고리 추가·수정·삭제
-- Supabase SQL Editor에서 웹앱 v4.5 배포 전에 한 번 실행합니다.

create table if not exists public.memo_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memo_categories_name_length_check
    check (name = btrim(name) and char_length(name) between 1 and 20),
  constraint memo_categories_user_name_unique unique (user_id, name)
);

create unique index if not exists memo_categories_user_name_lower_unique
  on public.memo_categories (user_id, lower(name));

create index if not exists memo_categories_user_position_idx
  on public.memo_categories (user_id, position, created_at);

alter table public.memo_categories enable row level security;

drop policy if exists "Users can read own memo categories" on public.memo_categories;
create policy "Users can read own memo categories"
  on public.memo_categories
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own memo categories" on public.memo_categories;
create policy "Users can create own memo categories"
  on public.memo_categories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own memo categories" on public.memo_categories;
create policy "Users can update own memo categories"
  on public.memo_categories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own memo categories" on public.memo_categories;
create policy "Users can delete own memo categories"
  on public.memo_categories
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.memo_categories to authenticated;

create or replace function public.touch_memo_category_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memo_categories_touch_updated_at on public.memo_categories;
create trigger memo_categories_touch_updated_at
before update on public.memo_categories
for each row execute function public.touch_memo_category_updated_at();

-- 기존 계정에는 기본 카테고리를 만들고, 이미 메모에 사용 중인 일반 카테고리도 보존합니다.
insert into public.memo_categories (user_id, name, position)
select
  users.id,
  defaults.name,
  defaults.position
from auth.users as users
cross join (
  values
    ('업무'::text, 0),
    ('아이디어'::text, 1),
    ('일상'::text, 2)
) as defaults(name, position)
on conflict do nothing;

insert into public.memo_categories (user_id, name, position)
select
  discovered.user_id,
  discovered.category,
  100 + row_number() over (
    partition by discovered.user_id
    order by discovered.category
  )::integer
from (
  select distinct on (user_id, lower(btrim(category)))
    user_id,
    btrim(category) as category
  from public.memos
  where user_id is not null
    and btrim(coalesce(category, '')) <> ''
    and btrim(category) not in ('전체', '중요', '할 일', '보관', '휴지통', '미분류')
  order by user_id, lower(btrim(category)), btrim(category)
) as discovered
on conflict do nothing;

create or replace function public.rename_memo_category(
  target_category_id uuid,
  replacement_name text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  previous_name text;
  normalized_name text := btrim(replacement_name);
  affected_memos integer := 0;
begin
  if current_user_id is null then
    raise exception '로그인 세션이 없습니다.' using errcode = '42501';
  end if;

  if normalized_name is null or char_length(normalized_name) = 0 then
    raise exception '카테고리 이름을 입력해주세요.' using errcode = '22023';
  end if;

  if char_length(normalized_name) > 20 then
    raise exception '카테고리 이름은 20자 이하만 사용할 수 있습니다.' using errcode = '22023';
  end if;

  if normalized_name in ('전체', '중요', '할 일', '보관', '휴지통', '미분류') then
    raise exception '시스템 카테고리 이름은 사용할 수 없습니다.' using errcode = '22023';
  end if;

  select name
    into previous_name
  from public.memo_categories
  where id = target_category_id
    and user_id = current_user_id
  for update;

  if previous_name is null then
    raise exception '변경할 카테고리를 찾지 못했습니다.' using errcode = 'P0002';
  end if;

  update public.memo_categories
  set name = normalized_name
  where id = target_category_id
    and user_id = current_user_id;

  update public.memos
  set category = normalized_name
  where user_id = current_user_id
    and category = previous_name;

  get diagnostics affected_memos = row_count;
  return affected_memos;
end;
$$;

create or replace function public.delete_memo_category(target_category_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  category_name text;
  category_count integer := 0;
  affected_memos integer := 0;
begin
  if current_user_id is null then
    raise exception '로그인 세션이 없습니다.' using errcode = '42501';
  end if;

  select name
    into category_name
  from public.memo_categories
  where id = target_category_id
    and user_id = current_user_id
  for update;

  if category_name is null then
    raise exception '삭제할 카테고리를 찾지 못했습니다.' using errcode = 'P0002';
  end if;

  select count(*)
    into category_count
  from public.memo_categories
  where user_id = current_user_id;

  if category_count <= 1 then
    raise exception '카테고리는 최소 1개를 남겨야 합니다.' using errcode = '22023';
  end if;

  update public.memos
  set category = '미분류'
  where user_id = current_user_id
    and category = category_name;

  get diagnostics affected_memos = row_count;

  delete from public.memo_categories
  where id = target_category_id
    and user_id = current_user_id;

  return affected_memos;
end;
$$;

revoke all on function public.rename_memo_category(uuid, text) from public;
revoke all on function public.delete_memo_category(uuid) from public;
grant execute on function public.rename_memo_category(uuid, text) to authenticated;
grant execute on function public.delete_memo_category(uuid) to authenticated;
