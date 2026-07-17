# SoloNote v4.3.2.2 계정 삭제 설정

이 버전의 화면 코드만 GitHub Pages에 올려서는 계정 삭제가 작동하지 않습니다. 아래 Supabase 설정을 한 번 적용해야 합니다.

## 1. 데이터베이스 점검

Supabase Dashboard → SQL Editor에서 다음 파일을 순서대로 실행합니다.

1. `supabase/sql/01_account_delete_preflight.sql`
2. `orphan_memo_count`가 `0`인지 확인
3. `supabase/sql/02_enable_account_delete_cascade.sql`

고아 메모가 있다면 두 번째 SQL을 실행하지 말고 먼저 데이터를 확인합니다.

## 2. Edge Function 배포

### Dashboard 방식

1. Supabase Dashboard → Edge Functions
2. 새 함수 이름을 `delete-account`로 생성
3. `supabase/functions/delete-account/index.ts` 내용을 붙여넣기
4. JWT 자동 검증은 끄고 배포
5. 함수 로그에서 배포 성공 확인

### Supabase CLI 방식

```bash
supabase login
supabase link --project-ref nxobwqvsqvowimherzlo
supabase functions deploy delete-account --no-verify-jwt
```

Edge Function에는 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 기본 환경 변수로 제공됩니다. 서비스 역할 키를 `config.js`, GitHub 저장소, 브라우저 코드에 넣지 마세요.

## 3. 배포 후 테스트

반드시 중요한 메모가 없는 테스트 계정으로 먼저 확인합니다.

1. 회원가입 및 이메일 인증
2. 테스트 메모 2개 작성
3. JSON 백업
4. 메뉴 → 계정 관리 → 계정 삭제
5. 현재 비밀번호 입력
6. `계정 삭제` 입력
7. 삭제 완료 후 같은 계정으로 로그인 불가 확인
8. Supabase Authentication → Users에서 계정 삭제 확인
9. Table Editor → memos에서 해당 사용자 메모 삭제 확인

## 보안 구조

- 현재 비밀번호는 Supabase Auth의 재로그인 요청에만 사용됩니다. Edge Function으로 전달되지 않습니다.
- Edge Function은 브라우저가 보내는 사용자 ID를 믿지 않고 로그인 JWT에서 사용자를 확인합니다.
- `service_role` 키는 Edge Function 안에서만 사용합니다.
- 함수는 로그인한 사용자 본인의 메모와 계정만 삭제합니다.
