# 훈노트 v4.5 Supabase 카테고리 설정

## 실행 전

1. 훈노트에서 `백업`을 눌러 JSON 파일을 보관합니다.
2. Supabase Dashboard의 SQL Editor를 엽니다.
3. 웹앱 v4.5 파일을 배포하기 전에 아래 SQL을 먼저 적용합니다.

## 적용

`supabase/sql/05_create_memo_categories.sql`의 전체 내용을 SQL Editor에 붙여 넣고 `Run`을 누릅니다.

이 SQL은 다음 작업을 수행합니다.

- `public.memo_categories` 생성
- 사용자별 RLS 정책과 권한 적용
- 기존 사용자에게 `업무`, `아이디어`, `일상` 생성
- 기존 메모에 사용 중인 일반 카테고리 보존
- 안전한 이름 변경·삭제 함수 생성
- 계정 삭제 시 카테고리도 함께 삭제되도록 외래 키 설정

## 적용 확인

SQL Editor에서 다음 쿼리를 실행합니다.

```sql
select to_regclass('public.memo_categories') as category_table;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('rename_memo_category', 'delete_memo_category')
order by routine_name;

select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'memo_categories'
order by policyname;
```

정상 결과는 테이블 이름 1개, 함수 2개, RLS 정책 4개입니다.

## 되돌리기 주의

웹앱 v4.5 배포 후에는 `memo_categories`를 임의로 삭제하지 마세요. 문제가 생기면 먼저 v4.4 웹 파일로 되돌린 뒤 원인을 확인합니다. 카테고리 테이블 자체를 제거하는 작업은 사용자 설정을 잃을 수 있으므로 별도 백업과 승인 없이 실행하지 않습니다.
