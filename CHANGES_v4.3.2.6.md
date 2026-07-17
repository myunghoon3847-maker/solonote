# 업무노트 v4.3.2.6 변경 내용

## 계정 삭제 Edge Function 경량화

- 진단에서 확인된 `OPTIONS 200 / POST 503` 경로를 기준으로 함수 구조를 단순화했습니다.
- `supabase-js` npm 모듈과 동적 import를 완전히 제거했습니다.
- Supabase Auth / Data REST API를 기본 `fetch()`로 직접 호출합니다.
- 처리 단계마다 8~12초의 개별 제한 시간을 적용했습니다.
- Auth 계정 삭제 전에 `ON DELETE CASCADE` 안전 점검을 수행합니다.
- 메모를 먼저 삭제하거나 삭제 후 다시 조회하는 추가 쿼리를 제거했습니다.
- Auth 삭제 성공 응답은 CASCADE 데이터 정리가 함께 성공한 경우에만 반환됩니다.
- 단계별 로그와 오류 코드를 추가했습니다.

## 기대 Invocation

- 정상: `OPTIONS 200`, `POST 200`
- SQL 미적용: `OPTIONS 200`, `POST 503`
- 세션 문제: `OPTIONS 200`, `POST 401/403`
- 관리자 삭제 오류: `OPTIONS 200`, `POST 4xx/5xx`
