-- 업무노트 v4.3.2.3
-- 계정 삭제 Edge Function이 실행 전에 ON DELETE CASCADE 상태를 확인하는 안전 점검 함수입니다.
-- 01, 02 SQL을 먼저 실행한 다음 이 파일을 실행하세요.

create or replace function public.get_account_deletion_readiness(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id_attnum smallint;
  cascade_enabled boolean := false;
  target_memo_count bigint := 0;
begin
  if target_user_id is null then
    return jsonb_build_object(
      'ready', false,
      'cascade_enabled', false,
      'memo_count', 0
    );
  end if;

  select a.attnum::smallint
    into user_id_attnum
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.memos'::regclass
    and a.attname = 'user_id'
    and not a.attisdropped;

  if user_id_attnum is not null then
    select exists (
      select 1
      from pg_catalog.pg_constraint c
      where c.conrelid = 'public.memos'::regclass
        and c.confrelid = 'auth.users'::regclass
        and c.contype = 'f'
        and c.confdeltype = 'c'
        and c.conkey = array[user_id_attnum]::smallint[]
    ) into cascade_enabled;
  end if;

  select count(*)
    into target_memo_count
  from public.memos
  where user_id = target_user_id;

  return jsonb_build_object(
    'ready', cascade_enabled,
    'cascade_enabled', cascade_enabled,
    'memo_count', target_memo_count
  );
end;
$$;

revoke all on function public.get_account_deletion_readiness(uuid) from public;
revoke all on function public.get_account_deletion_readiness(uuid) from anon;
revoke all on function public.get_account_deletion_readiness(uuid) from authenticated;
grant execute on function public.get_account_deletion_readiness(uuid) to service_role;

comment on function public.get_account_deletion_readiness(uuid) is
  'Service-role-only account deletion readiness check for public.memos ON DELETE CASCADE.';
