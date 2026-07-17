# 업무노트 v4.3.2.3 내부 검수 결과

검수 대상: 계정 삭제 안전성 보강판

## 통과한 정적 검사

- [x] 브라우저 JavaScript 전체 `node --check` 통과
- [x] Edge Function TypeScript 구문 변환 검사 통과
- [x] JWT 최근 password 인증 판별 헬퍼 테스트 통과
- [x] 잘못된 JWT 거부 헬퍼 테스트 통과
- [x] 계정 삭제 오류 코드 한국어 변환 테스트 통과
- [x] localStorage 업무노트 데이터 정리 테스트 통과
- [x] sessionStorage 업무노트 데이터 정리 테스트 통과
- [x] 업무노트와 무관한 저장 키 보존 테스트 통과
- [x] HTML 중복 ID 없음
- [x] HTML 로컬 자산 경로 존재 확인
- [x] Service Worker 정적 자산 경로 존재 확인
- [x] 화면 버전 `v4.3.2.3` 확인
- [x] 정적 자산 쿼리 `4323` 확인
- [x] 서비스워커 캐시 `solonote-v4-3-2-3-cache` 확인
- [x] 브라우저 파일에 service role 또는 secret key 없음
- [x] Edge Function에서 요청 본문 사용자 ID를 사용하지 않음
- [x] Edge Function에서 Supabase Auth `getUser` 재검증 확인
- [x] 서버의 최근 password 인증 검사 확인
- [x] 계정 삭제 전 CASCADE 안전 점검 RPC 호출 확인
- [x] Auth 삭제 전에 `memos` 직접 삭제가 없는 것 확인
- [x] Auth 삭제 후 잔여 메모 검증과 예외 정리 확인
- [x] SQL 안전 점검 함수가 service_role 전용인지 확인
- [x] 계정 삭제 요청 시간 제한과 중복 방지 확인

## 실제 환경에서 아직 필요한 검사

다음 항목은 Supabase 프로젝트와 실제 브라우저·스마트폰에서만 확인할 수 있으므로 아직 통과로 표시하지 않았습니다.

- [ ] 01~04 SQL 실제 실행
- [ ] Edge Function 실제 배포
- [ ] 올바른 비밀번호로 실제 계정 삭제
- [ ] 잘못된 비밀번호에서 데이터 유지
- [ ] Auth 사용자 삭제 확인
- [ ] 해당 사용자의 memos 0개 확인
- [ ] 다른 사용자 데이터 유지 확인
- [ ] PC와 스마트폰 로컬 데이터 정리 확인
- [ ] 삭제한 계정의 재로그인 실패 확인

## 판정

코드와 배포 패키지는 v4.3.2.3 계정 삭제 검수 단계로 진행할 수 있습니다. 실제 Supabase 설정과 테스트 계정 삭제까지 통과해야 안정 버전으로 확정할 수 있습니다.
