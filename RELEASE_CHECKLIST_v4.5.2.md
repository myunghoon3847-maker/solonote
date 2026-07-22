# 훈노트 v4.5.2 배포 체크리스트

## 배포 전

- [ ] 운영 메모를 JSON으로 백업한다.
- [ ] v4.5 카테고리 SQL이 적용되어 클라우드 연결이 정상인지 확인한다.
- [ ] 이번 버전에는 추가 SQL이 없음을 확인한다.

## GitHub Pages

- [ ] `hoonnote_v4_5_2_category_cleanup` 폴더 안의 파일 전체를 기존 `/solonote/` 파일과 교체한다.
- [ ] `index.html`만 올리지 않고 `css`, `js`, `service-worker.js`도 함께 교체한다.
- [ ] 배포 후 `https://myunghoon3847-maker.github.io/solonote/?v=452`에 접속한다.
- [ ] 메뉴 하단 `v4.5.2` 표시를 확인한다.

## 설치 앱

- [ ] 업데이트 안내가 표시되면 적용한다.
- [ ] 안내가 없으면 브라우저에서 `?v=452` 주소를 먼저 열고 앱을 다시 실행한다.
- [ ] `TEST_CHECKLIST_v4.5.2.md`를 스마트폰에서 확인한다.

## 권장 커밋 메시지

`Separate tasks from memo categories and style protected categories in HoonNote v4.5.2`
