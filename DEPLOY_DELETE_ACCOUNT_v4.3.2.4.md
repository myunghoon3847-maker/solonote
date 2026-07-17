# delete-account v4.3.2.4 재배포 방법

## 1. 기존 함수 코드 교체

1. Supabase Dashboard에서 프로젝트를 엽니다.
2. `Edge Functions` → `delete-account` → `Code`로 이동합니다.
3. 기존 코드를 모두 선택해 삭제합니다.
4. 아래 파일의 전체 내용을 복사해 붙여 넣습니다.

```text
supabase/functions/delete-account/index.ts
```

5. `Deploy updates`를 누릅니다.

새 함수를 다시 만들 필요는 없습니다. 기존 `delete-account` 함수를 업데이트합니다.

## 2. 배포 직후 확인

앱에서 삭제를 누르기 전에 Edge Function의 `Invocations` 화면을 열어둡니다.

정상이라면 다음 순서가 표시됩니다.

```text
OPTIONS 204
POST 200
```

계정 삭제 설정이 덜 된 경우에도 OPTIONS는 204가 되고, POST에서 401·403·500·503 같은 구체적인 상태가 표시되어야 합니다.

## 3. Logs에서 확인할 첫 로그

```text
CORS_PREFLIGHT_OK
DELETE_REQUEST_RECEIVED
```

`CORS_PREFLIGHT_OK`만 있고 POST가 없다면 브라우저 호출 또는 배포 캐시를 확인합니다.
`DELETE_REQUEST_RECEIVED` 이후 멈추면 마지막 단계 로그를 기준으로 원인을 확인합니다.

## 4. SQL 확인

기존에 실행하지 않았다면 아래 순서대로 실행합니다.

```text
01_account_delete_preflight.sql
02_enable_account_delete_cascade.sql
03_create_account_deletion_guard.sql
04_account_delete_verify.sql
```

최종 결과:

```text
cascade_enabled = true
guard_function_installed = true
orphan_memo_count = 0
null_user_id_count = 0
```
