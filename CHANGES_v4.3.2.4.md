# 업무노트 v4.3.2.4 변경 기록

## 수정 목적

Supabase Edge Function의 `OPTIONS` 사전 요청이 504 또는 546으로 종료되어 실제 `POST` 계정 삭제 요청이 시작되지 않는 문제를 수정했습니다.

## 주요 변경

- Edge Function을 `export default { fetch }` 구조로 변경
- `OPTIONS` 요청을 npm 모듈 로딩보다 먼저 204로 즉시 응답
- `@supabase/supabase-js`를 POST 요청에서만 동적으로 로드
- 외부 의존성 버전을 `2.95.0`으로 고정
- 요청별 `requestId` 생성 및 응답 헤더 포함
- 단계별 구조화 로그 추가
- 클라이언트 제한 시간을 30초에서 45초로 조정
- 시간 초과 후 Auth 사용자 존재 여부를 다시 확인
- 계정이 이미 삭제된 경우 로컬 정리를 완료하고 로그인 화면으로 이동
- PWA 캐시와 정적 자산 버전을 `4324`로 갱신

## 정상 호출 시 예상 Invocation

1. `OPTIONS` → 204
2. `POST` → 200 또는 원인이 표시된 4xx/5xx

## 단계별 로그

- `CORS_PREFLIGHT_OK`
- `DELETE_REQUEST_RECEIVED`
- `RUNTIME_DEPENDENCY_READY`
- `USER_AUTHENTICATED`
- `RECENT_PASSWORD_AUTH_VERIFIED`
- `DATABASE_GUARD_VERIFIED`
- `AUTH_DELETE_STARTED`
- `AUTH_DELETE_COMPLETED`
- `MEMO_CLEANUP_VERIFIED`
- `DELETE_RESPONSE_SENT`
