# delete-account v4.3.2.6 적용 순서

## 1. 진단 함수에서 실제 함수로 교체

Supabase Dashboard에서:

1. Edge Functions
2. delete-account
3. Code
4. 현재 진단 코드를 모두 삭제
5. `supabase/functions/delete-account/index.ts` 전체 내용 붙여넣기
6. Deploy updates

함수 이름은 계속 `delete-account`를 사용합니다.

## 2. SQL 확인

SQL Editor에서 아래 파일을 순서대로 적용합니다.

1. `01_account_delete_preflight.sql`
2. `02_enable_account_delete_cascade.sql`
3. `03_create_account_deletion_guard.sql`
4. `04_account_delete_verify.sql`

최종 결과:

- `cascade_enabled = true`
- `guard_function_installed = true`
- `orphan_memo_count = 0`
- `null_user_id_count = 0`

## 3. 앱 배포

GitHub Pages에 v4.3.2.6 파일을 배포한 후 아래 주소로 확인합니다.

`https://myunghoon3847-maker.github.io/solonote/?v=4326`

## 4. 테스트

중요한 데이터가 없는 테스트 계정으로 한 번만 실행합니다.

정상 Invocation:

- OPTIONS 200
- POST 200

POST가 실패해도 OPTIONS가 200이면 CORS 연결은 정상입니다. POST 상태와 Logs의 마지막 단계 코드를 확인합니다.
