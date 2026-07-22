# 훈노트 v4.5

훈노트(HoonNote) v4.5는 v4.4의 클라우드 메모·로그인·PWA·Android TWA 준비 구조를 유지하면서 사용자별 카테고리 추가·이름 변경·삭제 기능을 도입한 버전입니다.

## v4.5 핵심 기능

- 사용자별 카테고리를 Supabase에 저장하고 여러 기기에서 동기화
- `카테고리 관리` 창에서 새 카테고리 추가
- 기존 카테고리 이름 변경 시 연결된 모든 메모도 함께 변경
- 카테고리 삭제 시 메모를 삭제하지 않고 `미분류`로 이동
- 같은 이름·빈 이름·20자 초과·시스템 이름 등록 방지
- 카테고리를 최소 1개 유지
- JSON 백업에 카테고리 목록 포함
- v4.4 이전 백업과 기존 메모 호환

## 시스템 분류

`전체`, `중요`, `할 일`, `보관`, `휴지통`, `미분류`는 앱 동작에 사용하는 이름이므로 사용자가 추가·변경·삭제할 수 없습니다. `할 일`과 `보관`은 다음 정보 구조 개편 전까지 기존 메모 호환을 위해 유지합니다.

## 배포 순서

1. 현재 운영 데이터를 JSON으로 백업합니다.
2. Supabase SQL Editor에서 `supabase/sql/05_create_memo_categories.sql`을 실행합니다.
3. `SUPABASE_CATEGORY_SETUP_v4.5.md`의 확인 쿼리로 테이블·정책·함수를 확인합니다.
4. 이 폴더의 웹 파일을 GitHub Pages 저장소에 배포합니다.
5. `https://myunghoon3847-maker.github.io/solonote/?v=450`에서 v4.5 표시를 확인합니다.
6. `TEST_CHECKLIST_v4.5.md`에 따라 PC와 스마트폰에서 검수합니다.

웹 파일보다 SQL을 먼저 적용해야 합니다. 이번 변경은 웹앱과 데이터베이스 기능이며 기존 TWA 래퍼 설정을 바꾸지 않으므로, 웹 배포 확인 전에는 새 AAB를 만들지 않습니다.

## 주요 문서

- `CHANGES_v4.5.md`: 변경사항
- `SUPABASE_CATEGORY_SETUP_v4.5.md`: 데이터베이스 적용 방법
- `TEST_CHECKLIST_v4.5.md`: 기능 검수표
- `RELEASE_CHECKLIST_v4.5.md`: 배포 순서
- `AGENTS.md`: Codex 개발 원칙
- `PROJECT_CONTEXT.md`: 프로젝트 구조와 현재 상태

## Android 기준값

- 표시 이름: 훈노트
- 패키지명: `com.hooncompany.hoonnote`
- target API: `36`
- 배포 형식: `AAB`
- 앱 서명: Google Play App Signing

실제 AAB, APK, 서명키는 이 ZIP에 포함되어 있지 않습니다.
