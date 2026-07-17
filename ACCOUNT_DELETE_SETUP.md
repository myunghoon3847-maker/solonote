# 업무노트 v4.3.2.3 계정 삭제 설정

이 버전의 웹 파일만 GitHub Pages에 올려서는 계정 삭제가 작동하지 않습니다. Supabase 데이터베이스 설정과 Edge Function 배포를 모두 완료해야 합니다.

## 0. 시작 전 백업

1. 업무노트에서 JSON 백업을 내려받습니다.
2. 중요한 계정이 아닌 별도 테스트 계정을 준비합니다.
3. Supabase Dashboard의 프로젝트가 `nxobwqvsqvowimherzlo`인지 확인합니다.

## 1. 데이터베이스 SQL 적용

Supabase Dashboard → SQL Editor에서 다음 순서대로 실행합니다.

### 1-1. 사전 점검

`supabase/sql/01_account_delete_preflight.sql`

확인 기준:

- `orphan_memo_count = 0`
- 외래 키 목록에서 `memos.user_id` 상태 확인
- `null_user_id_count`는 기존 레거시 데이터 점검용으로 기록

`orphan_memo_count`가 0이 아니면 다음 SQL을 실행하지 말고 해당 행을 먼저 확인합니다.

### 1-2. CASCADE 외래 키 적용

`supabase/sql/02_enable_account_delete_cascade.sql`

이 SQL은 `public.memos.user_id`가 `auth.users.id`를 `ON DELETE CASCADE`로 참조하도록 정리합니다.

### 1-3. 서버 안전 점검 함수 설치

`supabase/sql/03_create_account_deletion_guard.sql`

이 함수는 계정 삭제 직전에 Edge Function이 CASCADE 설정을 다시 확인할 때 사용합니다. 함수 실행 권한은 `service_role`에만 부여됩니다.

### 1-4. 최종 SQL 확인

`supabase/sql/04_account_delete_verify.sql`

정상 기준:

```text
cascade_enabled = true
guard_function_installed = true
orphan_memo_count = 0
```

## 2. Edge Function 배포

함수 이름은 반드시 `delete-account`입니다.

### Supabase CLI 방식

```bash
supabase login
supabase link --project-ref nxobwqvsqvowimherzlo
supabase functions deploy delete-account --no-verify-jwt
```

프로젝트의 `supabase/config.toml`에는 다음 설정이 포함되어 있습니다.

```toml
[functions.delete-account]
verify_jwt = false
```

현재 앱은 publishable key를 사용하므로 함수 코드 안에서 로그인 JWT를 Supabase Auth 서버로 직접 검증합니다. `verify_jwt = false`라고 해서 인증을 생략하는 구조는 아닙니다.

### Dashboard 방식

1. Supabase Dashboard → Edge Functions
2. `delete-account` 함수 생성 또는 기존 함수 열기
3. `supabase/functions/delete-account/index.ts` 전체 내용으로 교체
4. JWT 자동 검증을 끈 상태로 배포
5. Functions 로그에서 배포 오류가 없는지 확인

## 3. 관리자 키 확인

Edge Function에서는 다음 순서로 관리자 키를 찾습니다.

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

기본 제공되는 `SUPABASE_SERVICE_ROLE_KEY`를 사용할 수 있습니다. 새 secret key를 별도로 사용하는 경우 Edge Function Secrets에 `SUPABASE_SECRET_KEY`로 등록할 수 있습니다.

절대 넣으면 안 되는 위치:

- `js/config.js`
- GitHub 저장소
- HTML 또는 브라우저 JavaScript
- 공개 문서와 스크린샷

## 4. GitHub Pages 배포

v4.3.2.3 파일을 저장소 루트에 업로드하고 배포합니다.

권장 커밋 메시지:

```text
Harden secure account deletion flow in v4.3.2.3
```

캐시 확인 주소:

```text
https://myunghoon3847-maker.github.io/solonote/?v=4323
```

## 5. 실제 삭제 테스트

중요한 데이터가 없는 테스트 계정으로 진행합니다.

1. 회원가입 및 이메일 인증
2. 로그인 후 메모 3개와 체크리스트 작성
3. JSON 백업
4. 잘못된 비밀번호로 삭제 시도 → 아무 데이터도 삭제되지 않아야 함
5. 올바른 비밀번호와 `계정 삭제` 문구 입력
6. 로그인 화면 이동 확인
7. 같은 이메일·비밀번호로 로그인 실패 확인
8. Authentication → Users에서 사용자 삭제 확인
9. Table Editor → memos에서 해당 사용자 행 0개 확인
10. 다른 테스트 계정의 메모가 그대로인지 확인

## 6. 오류별 점검 위치

### 데이터베이스 안전 점검 미설치

앱 메시지:

```text
계정 삭제용 데이터베이스 안전 점검이 아직 설치되지 않았습니다.
```

해결: `03_create_account_deletion_guard.sql` 실행

### CASCADE 설정 미완료

앱 메시지:

```text
계정 삭제용 ON DELETE CASCADE 설정이 아직 완료되지 않았습니다.
```

해결: `02_enable_account_delete_cascade.sql` 실행 후 `04_account_delete_verify.sql` 확인

### Edge Function 없음

해결: `delete-account` 함수 이름과 배포 상태 확인

### 관리자 키 설정 오류

해결: Edge Function Secrets와 Functions 로그 확인. 관리자 키를 브라우저 코드에 추가해서 해결하면 안 됩니다.

### 저장소 파일 소유 오류

Supabase Storage 객체를 사용자가 소유하고 있으면 Auth 사용자 삭제가 거부될 수 있습니다. 현재 업무노트는 파일 첨부 기능을 사용하지 않지만, 향후 파일 기능을 추가할 때는 계정 삭제 전에 해당 사용자의 Storage 객체를 먼저 정리해야 합니다.

## 계정 삭제 처리 순서

```text
현재 사용자 확인
→ 최근 비밀번호 인증 확인
→ CASCADE 안전 점검
→ Auth 사용자 삭제
→ CASCADE 결과 확인
→ 필요 시 잔여 메모 추가 정리
→ 브라우저 로컬 데이터 정리
→ 로그인 화면 이동
```

Auth 사용자 삭제가 실패하면 앞 단계에서 메모를 별도로 지우지 않으므로 기존 메모가 유지됩니다.
