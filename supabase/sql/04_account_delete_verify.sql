-- 업무노트 v4.3.2.4 계정 삭제 최종 설정 확인
-- 결과의 cascade_enabled가 true이고 guard_function_installed가 true여야 합니다.

select exists (
  select 1
  from pg_catalog.pg_constraint c
  where c.conrelid = 'public.memos'::regclass
    and c.confrelid = 'auth.users'::regclass
    and c.contype = 'f'
    and c.confdeltype = 'c'
    and pg_catalog.pg_get_constraintdef(c.oid) ilike 'FOREIGN KEY (user_id)%'
) as cascade_enabled;

select to_regprocedure(
  'public.get_account_deletion_readiness(uuid)'
) is not null as guard_function_installed;

select count(*) as orphan_memo_count
from public.memos m
left join auth.users u on u.id = m.user_id
where m.user_id is not null
  and u.id is null;

select count(*) as null_user_id_count
from public.memos
where user_id is null;
