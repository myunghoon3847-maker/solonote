-- 훈노트 v4.5.3 운영 DB 구조·RLS 확인용 읽기 전용 SQL
-- 실제 메모 내용과 사용자 이메일은 조회하지 않습니다.
-- 이 파일은 데이터나 정책을 변경하지 않습니다.

-- 1. 대상 테이블 존재와 RLS 상태
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('memos', 'memo_categories')
  and c.relkind in ('r', 'p')
order by c.relname;

-- 2. 컬럼, 타입, null, 기본값
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('memos', 'memo_categories')
order by table_name, ordinal_position;

-- 3. PK, FK, UNIQUE, CHECK 제약
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('memos', 'memo_categories')
order by c.relname, con.conname;

-- 4. 인덱스
select schemaname, tablename, indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename in ('memos', 'memo_categories')
order by tablename, indexname;

-- 5. RLS 정책 전체
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('memos', 'memo_categories')
order by tablename, cmd, policyname;

-- 6. 테이블 권한
select table_schema, table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('memos', 'memo_categories')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by table_name, grantee, privilege_type;

-- 7. 대상 함수 정의와 보안 모드
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_account_deletion_readiness',
    'rename_memo_category',
    'delete_memo_category',
    'touch_memo_category_updated_at'
  )
order by p.proname, arguments;

-- 8. 함수 실행 권한
select routine_schema, routine_name, grantee, privilege_type, is_grantable
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'get_account_deletion_readiness',
    'rename_memo_category',
    'delete_memo_category',
    'touch_memo_category_updated_at'
  )
order by routine_name, grantee;

-- 9. 트리거
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('memos', 'memo_categories')
order by event_object_table, trigger_name, event_manipulation;

-- 10. 실제 행 내용을 노출하지 않는 개수 요약
select 'memos' as table_name, count(*) as row_count from public.memos
union all
select 'memo_categories' as table_name, count(*) as row_count from public.memo_categories;
