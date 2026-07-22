# 훈노트 v4.5.3

훈노트(HoonNote) v4.5.3은 v4.5.2의 화면과 기능을 유지하면서 출시 전 보안·데이터 안정성을 보강한 패치 버전입니다.

## v4.5.3 수정 내용

- 메모 전체 조회와 레거시 카테고리 변환에 로그인 사용자 `user_id` 조건 추가
- 백업 JSON의 메모·카테고리·체크리스트 구조와 길이 검증
- 복원 파일 10MB, 메모 5,000개, 카테고리 100개, 체크리스트 총 20,000개 제한
- 체크리스트 ID 정규화·중복 제거와 HTML 속성 이스케이프
- 제목·본문·프로젝트·체크리스트 입력 길이 제한 및 저장 직전 재검증
- 백업·계정 삭제 요청 버전 표기를 `4.5.3`으로 통일
- 정적 자원·서비스워커 캐시 버전을 `v=453`으로 갱신

## 유지되는 기능

- 로그인·회원가입·비밀번호 재설정·계정 삭제
- 사용자별 Supabase 클라우드 저장과 여러 기기 동기화
- 메모 작성·수정·검색·중요 표시·보관·휴지통·영구 삭제
- 체크리스트와 상단 `할 일` 화면
- 사용자 카테고리 추가·이름 변경·삭제
- JSON 백업·추가 복원과 이전 백업 호환
- PWA 설치·업데이트와 Android TWA

## 배포 순서

1. 운영 데이터를 JSON으로 백업합니다.
2. 이 폴더의 파일 전체를 GitHub Pages 저장소의 기존 `/solonote/` 파일과 교체합니다.
3. `https://myunghoon3847-maker.github.io/solonote/?v=453`에 접속합니다.
4. 메뉴 하단의 `v4.5.3` 표시를 확인합니다.
5. 설치 앱에 업데이트 안내가 보이면 적용합니다.
6. `TEST_CHECKLIST_v4.5.3.md`에 따라 스마트폰과 PC에서 확인합니다.

이번 패치는 데이터베이스 구조를 변경하지 않으므로 추가 SQL과 새 AAB가 필요하지 않습니다. 다만 운영 `memos` RLS 원본은 패키지에 없으므로, 전체 보안 검수를 마치려면 `supabase/sql/00_verify_live_schema_rls_read_only.sql` 실행 결과가 필요합니다. 이 확인 SQL은 데이터를 변경하지 않습니다.

## 주요 문서

- `CHANGES_v4.5.3.md`: 변경 기록
- `TEST_CHECKLIST_v4.5.3.md`: 실기기 검수표
- `RELEASE_CHECKLIST_v4.5.3.md`: 배포·롤백 절차
- `VALIDATION_REPORT_v4.5.3.md`: 자동 검수와 잔여 확인 사항
- `supabase/sql/00_verify_live_schema_rls_read_only.sql`: 운영 DB 읽기 전용 확인 SQL
- `AGENTS.md`: Codex 개발 원칙
- `PROJECT_CONTEXT.md`: 프로젝트 구조와 현재 상태

## Android 기준값

- 표시 이름: 훈노트
- 패키지명: `com.hooncompany.hoonnote`
- target API: `36`
- 배포 형식: `AAB`
- 앱 서명: Google Play App Signing

실제 AAB, APK, 서명키는 이 ZIP에 포함되어 있지 않습니다.
