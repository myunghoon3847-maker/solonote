# 업무노트 v4.3.2.5

업무노트 v4.3.2.5은 v4.3.2.2의 휴지통 전용 화면을 유지하면서 **계정 삭제 과정의 데이터 손실 방지와 서버 검증을 강화한 계정 삭제 완성 후보판**입니다.

## 이번 버전의 핵심 변경

- 브라우저의 비밀번호 입력만 믿지 않고 Edge Function에서도 최근 password 인증 기록을 확인
- 계정 삭제 전에 `memos.user_id → auth.users.id`의 `ON DELETE CASCADE` 설정을 서버에서 재검증
- 메모를 먼저 지우지 않고 Auth 사용자 삭제를 실행해, 계정 삭제 실패 시 메모가 먼저 사라지는 문제 방지
- Auth 사용자 삭제 성공 후 남은 메모가 0개인지 확인
- 예외적으로 메모가 남으면 서버에서 추가 정리 후 다시 검증
- 계정은 삭제됐지만 후속 검증에 문제가 생긴 경우를 일반 실패와 구분
- 잘못된 비밀번호, 세션 만료, Edge Function 미배포, SQL 미적용, 저장소 파일 소유 등 오류 안내 세분화
- 계정 삭제 요청 30초 시간 제한과 중복 요청 방지
- 계정 삭제 후 localStorage·sessionStorage·Supabase 로컬 세션 정리
- PWA 캐시 및 정적 자산 버전 `4325` 적용

## 반드시 적용해야 하는 Supabase 설정

웹 파일만 GitHub Pages에 배포하면 계정 삭제는 작동하지 않습니다. 다음 파일을 순서대로 적용해야 합니다.

1. `supabase/sql/01_account_delete_preflight.sql`
2. `supabase/sql/02_enable_account_delete_cascade.sql`
3. `supabase/sql/03_create_account_deletion_guard.sql`
4. `supabase/sql/04_account_delete_verify.sql`
5. `supabase/functions/delete-account/index.ts` 배포

자세한 순서는 `ACCOUNT_DELETE_SETUP.md`를 확인하세요.

## 보안 원칙

- 관리자 키는 브라우저, `config.js`, GitHub 저장소에 넣지 않습니다.
- Edge Function은 요청 본문의 사용자 ID를 받지 않습니다.
- 로그인 JWT를 Supabase Auth 서버에서 검증한 뒤 해당 사용자 본인만 삭제합니다.
- JWT의 최근 password 인증 기록이 5분을 넘으면 삭제를 거부합니다.
- 데이터베이스 CASCADE 안전 점검을 통과하지 못하면 계정과 메모를 모두 유지합니다.

## 테스트 문서

- 계정 삭제 전용: `ACCOUNT_DELETE_TEST_CHECKLIST.md`
- v4.3.2.5 변경 기록: `CHANGES_v4.3.2.5.md`
- 내부 정적 검수: `VALIDATION_REPORT_v4.3.2.5.md`
- 전체 기능: `TEST_CHECKLIST.md`
- 출시 점검: `RELEASE_CHECKLIST.md`

## 배포 후 캐시 확인 주소

```text
https://myunghoon3847-maker.github.io/solonote/?v=4325
```

실제 계정 삭제는 중요한 데이터가 없는 별도 테스트 계정으로 먼저 확인해야 합니다.

## v4.3.2.5 긴급 배포 안내

계정 삭제 함수의 OPTIONS 504/546 문제 해결 절차는 `DEPLOY_DELETE_ACCOUNT_v4.3.2.5.md`를 확인하세요.

## v4.3.2.5 긴급 수정

브라우저 시간 초과 시 읽기 전용 `AbortError.code`를 변경해 발생하던 `Cannot set property code of which has only a getter` 오류를 수정했습니다. 이번 수정은 웹앱 배포만 필요하며 Edge Function 재배포는 필요하지 않습니다.
