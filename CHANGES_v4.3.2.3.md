# 업무노트 v4.3.2.3 변경 기록

## 목적

계정 삭제 과정에서 메모가 먼저 삭제되고 Auth 계정 삭제가 실패할 수 있었던 위험을 제거하고, 실제 Supabase 설정이 준비되지 않은 상태에서는 삭제를 시작하지 않도록 보강했습니다.

## 서버 변경

- 메모 선삭제 로직 제거
- Auth 사용자 삭제와 `ON DELETE CASCADE`를 기본 삭제 경로로 변경
- Supabase Auth 서버를 통한 JWT 사용자 검증 유지
- JWT `amr`의 최근 password 인증을 서버에서 추가 확인
- 계정 삭제 DB 안전 점검 RPC 호출 추가
- Auth 삭제 후 잔여 메모 개수 검증 추가
- 잔여 메모 발견 시 서비스 역할 기반 추가 정리와 재검증
- Storage 소유, 외래 키, 세션, 설정 오류 코드 세분화
- `SUPABASE_SECRET_KEY`와 기존 `SUPABASE_SERVICE_ROLE_KEY` 모두 지원

## 데이터베이스 변경

- `03_create_account_deletion_guard.sql` 추가
- `04_account_delete_verify.sql` 추가
- 안전 점검 함수는 `service_role`만 실행 가능

## 브라우저 변경

- 로컬 세션이 아닌 `auth.getUser()`로 현재 사용자 재확인
- 비밀번호 재로그인 후 사용자 ID 일치 확인
- 삭제 요청 30초 제한 추가
- 서버 오류 코드별 한국어 안내 추가
- 부분 완료 상태와 일반 실패 상태 구분
- localStorage와 sessionStorage의 업무노트 데이터 정리

## 버전

- 화면 버전: v4.3.2.3
- 정적 자산 쿼리: 4323
- 서비스워커 캐시: `solonote-v4-3-2-3-cache`
