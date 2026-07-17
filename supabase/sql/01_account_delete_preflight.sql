-- SoloNote v4.3.2 계정 삭제 사전 점검

-- 결과가 0이어야 안전합니다.
select count(*) as orphan_memo_count
from public.memos m
left join auth.users u on u.id = m.user_id
where m.user_id is not null
  and u.id is null;

-- 현재 user_id 외래 키와 삭제 규칙을 확인합니다.
select
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.memos'::regclass
  and c.contype = 'f';

-- user_id가 비어 있는 메모 수를 확인합니다.
select count(*) as null_user_id_count
from public.memos
where user_id is null;
