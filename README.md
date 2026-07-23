# 훈노트 v4.5.6

훈노트 v4.5.6은 v4.5.5에서 확인된 로고 표시·홈 이동·모바일 가로 넘침·PWA 캐시 버전 문제를 수정한 안정화 배포본입니다.

## 핵심 수정

- 로고를 기본 버튼이 아닌 홈 링크형 UI로 변경
- JavaScript 오류나 구버전 캐시 상황에서도 홈을 다시 열 수 있는 링크 대체 동작 추가
- 서비스워커 등록 주소와 정적 파일 캐시를 `v=456`으로 통일
- 모바일 전체 가로 넘침 차단
- 모바일 카테고리를 가로 스크롤 대신 화면 안 줄바꿈으로 변경
- 320~430px 모바일 폭 브라우저 검수 완료

## 배포

1. 운영 데이터를 JSON으로 백업합니다.
2. 이 폴더의 파일 전체를 GitHub Pages 저장소의 기존 `/solonote/` 파일과 교체합니다.
3. `https://myunghoon3847-maker.github.io/solonote/?v=456`을 엽니다.
4. 메뉴 하단 `v4.5.6`을 확인합니다.
5. 설치 앱에 업데이트 안내가 나타나면 적용하고 앱을 완전히 닫았다가 다시 엽니다.
6. `TEST_CHECKLIST_v4.5.6.md`에 따라 확인합니다.

이번 버전은 데이터베이스 구조를 바꾸지 않으므로 추가 SQL이 필요하지 않습니다. 웹 파일만 수정한 경우 새 AAB도 필수는 아닙니다.

## 주요 문서

- `CHANGES_v4.5.6.md`
- `VALIDATION_REPORT_v4.5.6.md`
- `TEST_CHECKLIST_v4.5.6.md`
- `RELEASE_CHECKLIST_v4.5.6.md`

## Android 기준값

- 표시 이름: 훈노트
- 패키지명: `com.hooncompany.hoonnote`
- 배포 형식: AAB
- 앱 서명: Google Play App Signing

실제 AAB, APK, 서명키는 이 ZIP에 포함되어 있지 않습니다.
