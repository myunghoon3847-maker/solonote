# 훈노트 v4.5.3 내부 검수 보고서

## 자동 검수

- 전체 JavaScript와 서비스워커 `node --check` 통과
- 보안 회귀 테스트 통과
  - 악성 체크리스트 ID 정규화·HTML 이스케이프
  - 과대·손상 백업 데이터 거부
  - 저장 직전 입력 길이 재검증
  - 체크리스트 중복 ID 정리
  - 메모 조회·레거시 변환의 `user_id` 조건
  - 화면·백업·계정 삭제·캐시 버전 일치
  - HTML과 서비스워커의 로컬 정적 파일 존재
- JSON 문법 검사 통과
- 주요 정적 경로 7개 로컬 HTTP 200 응답 확인
- HTML 표준 검사에서 v4.5.2부터 있던 자체 닫힘 표기·접근성 권고 61건을 제외한 나머지 규칙 통과
- 일반적인 관리자 키·DB 비밀번호·서명키 패턴이 소스에 없는지 확인

## 보안 판단

- 백업 파일에 포함된 제목·내용은 기존부터 HTML 이스케이프 또는 `textContent`로 출력되고 있습니다.
- v4.5.3은 추가로 동적 ID 속성을 이스케이프하고 안전하지 않은 체크리스트 ID를 재발급합니다.
- 메모 CRUD는 사용자 ID 조건을 사용하며, 최종 권한 차단은 운영 Supabase RLS가 담당합니다.
- `memo_categories`의 RLS·권한 SQL 원본은 패키지에 있습니다.

## 아직 확인할 항목

- 운영 `memos` 테이블의 실제 SELECT/INSERT/UPDATE/DELETE RLS 원본
- 테스트 계정 A·B를 이용한 교차 계정 접근 차단 실증
- 배포 후 실제 Supabase CRUD·충돌 처리·계정 삭제
- 실제 AAB, Play App Signing SHA-256, 공개 `assetlinks.json` 일치
- 기존 HTML 접근성 권고 61건은 이번 보안 패치에서 대량 수정하지 않고 별도 개선 후보로 유지

`supabase/sql/00_verify_live_schema_rls_read_only.sql` 결과를 확보하기 전에는 운영 RLS를 추정해 변경하지 않습니다.
