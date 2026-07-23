# 훈노트 v4.5.6 배포 체크리스트

1. 운영 메모를 JSON으로 백업합니다.
2. GitHub Pages 저장소의 기존 앱 파일을 v4.5.6 파일 전체로 교체합니다.
3. 특히 다음 파일이 누락되지 않았는지 확인합니다.
   - `index.html`
   - `css/style.css`
   - `js/app.js`
   - `js/pwa.js`
   - `service-worker.js`
4. `https://myunghoon3847-maker.github.io/solonote/?v=456`에 접속합니다.
5. 메뉴 하단 `v4.5.6`을 확인합니다.
6. 설치 앱에 업데이트 안내가 나타나면 적용한 뒤 앱을 완전히 닫고 다시 엽니다.
7. `TEST_CHECKLIST_v4.5.6.md`를 실행합니다.

## 롤백

문제가 있으면 저장소 파일을 v4.5.5 배포본으로 되돌립니다. DB 구조는 변경되지 않았으므로 SQL 롤백은 필요 없습니다.

## 권장 커밋 메시지

`Fix HoonNote logo fallback, stale PWA cache and mobile overflow for v4.5.6`
