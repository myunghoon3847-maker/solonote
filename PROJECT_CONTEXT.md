# 훈노트 프로젝트 맥락

## 제품

훈노트는 김명훈 운영자가 직접 편하게 사용하기 위한 로그인형 개인 클라우드 노트입니다. 복잡한 협업·수익화 기능보다 혼자 빠르게 기록하고 다시 찾는 경험을 우선합니다.

## 기술 구조

- `index.html`: 앱 화면과 모달
- `css/style.css`: 전체 반응형 UI
- `js/auth.js`: 로그인·회원가입·비밀번호 재설정
- `js/storage.js`: Supabase 메모·카테고리 저장과 캐시
- `js/ui.js`: 메모·상세·정렬 UI 렌더링
- `js/app.js`: 앱 상태, 이벤트, 뒤로가기 기록, 동기화, 카테고리 관리
- `js/account.js`: 계정 삭제
- `js/pwa.js`, `service-worker.js`: 설치·업데이트·캐시
- `supabase/sql`: 데이터베이스 설정과 마이그레이션
- `supabase/functions/delete-account`: 계정 삭제 Edge Function

## v4.5.5 데이터 구조

- `public.memos`: 메모, 프로젝트, 기존 카테고리 문자열, 중요·삭제 상태, 체크리스트
- `public.memo_categories`: 사용자별 관리 가능한 카테고리 이름과 표시 순서
- `auth.users`: Supabase 인증 사용자

카테고리 이름 변경·삭제는 RPC 함수에서 `memo_categories`와 `memos.category`를 한 트랜잭션으로 갱신합니다. 삭제된 카테고리의 메모는 `미분류`로 이동합니다.

v4.5.5는 데이터베이스 구조를 변경하지 않습니다. 프로젝트 기능은 화면과 검색에서 제거했지만 기존 `memos.project` 값은 백업 호환과 데이터 보존을 위해 유지합니다. v4.5의 `05_create_memo_categories.sql`을 이미 실행했다면 추가 SQL은 없습니다. v4.5.3의 사용자별 클라우드 조회 조건과 백업 복원 검증도 유지합니다.

## 배포 기준

웹앱은 GitHub Pages의 `/solonote/` 경로를 사용합니다. Android 앱은 이 웹앱을 여는 TWA 구조이며, Digital Asset Links는 원본 도메인 루트의 `/.well-known/assetlinks.json`에서 검증되어야 합니다.
