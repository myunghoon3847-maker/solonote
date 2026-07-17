-- SoloNote v4.3.2
-- public.memos.user_id가 auth.users.id를 ON DELETE CASCADE로 참조하도록 정리합니다.
-- 먼저 01_account_delete_preflight.sql을 실행해 orphan_memo_count가 0인지 확인하세요.

do $$
declare
  constraint_row record;
begin
  if exists (
    select 1
    from public.memos m
    left join auth.users u on u.id = m.user_id
    where m.user_id is not null
      and u.id is null
  ) then
    raise exception 'auth.users에 없는 user_id를 가진 메모가 있습니다. 먼저 고아 데이터를 정리하세요.';
  end if;

  for constraint_row in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.memos'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike 'FOREIGN KEY (user_id)%'
  loop
    execute format(
      'alter table public.memos drop constraint %I',
      constraint_row.conname
    );
  end loop;

  alter table public.memos
    add constraint memos_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
end $$;

create index if not exists memos_user_id_idx
  on public.memos(user_id);
