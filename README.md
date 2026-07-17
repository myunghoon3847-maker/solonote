# SoloNote v4.3.2

SoloNote v4.3.2는 회원가입이 완료된 v4.3.1.1을 기준으로 **안전한 계정 및 사용자 데이터 삭제 기능**을 추가한 출시 준비 버전입니다. 기존 메모·할 일·동기화·백업·PWA 기능은 유지합니다.

## 핵심 변경

- 우측 메뉴에 `계정 관리 → 계정 삭제` 추가
- 삭제 전 JSON 백업 버튼 제공
- 현재 비밀번호 재확인
- `계정 삭제` 확인 문구 입력
- 삭제 진행 중 중복 요청과 창 닫기 차단
- Supabase Edge Function에서 로그인 JWT 재검증
- 해당 사용자의 클라우드 메모와 Auth 계정 삭제
- 로컬 자동 저장 초안과 이전 메모 정리
- 삭제 후 로그인 화면에 완료 메시지 표시
- PWA 캐시를 v4.3.2로 갱신

## 중요: Supabase 설정 필요

GitHub Pages에 웹 파일만 배포하면 계정 삭제는 작동하지 않습니다. 다음 문서를 따라 SQL과 Edge Function을 한 번 배포해야 합니다.

- `ACCOUNT_DELETE_SETUP.md`
- `supabase/sql/01_account_delete_preflight.sql`
- `supabase/sql/02_enable_account_delete_cascade.sql`
- `supabase/functions/delete-account/index.ts`

`service_role` 키는 브라우저 코드나 GitHub 저장소에 넣지 않습니다. Edge Function의 서버 환경에서만 사용합니다.

## 테스트

- 계정 삭제 전용: `ACCOUNT_DELETE_TEST_CHECKLIST.md`
- 전체 기능: `TEST_CHECKLIST.md`
- 출시 점검: `RELEASE_CHECKLIST.md`

배포 후 캐시 확인 주소:

```text
https://myunghoon3847-maker.github.io/solonote/?v=432
```

실제 계정 삭제는 중요한 데이터가 없는 테스트 계정으로 먼저 확인하세요.
