# 훈노트 v4.5.1 배포 체크리스트

## 1. 배포 전

- [ ] 운영 계정의 메모를 JSON으로 백업
- [ ] 현재 v4.5 배포 파일 별도 보관
- [ ] v4.5에서 `05_create_memo_categories.sql`을 이미 실행했는지 확인

이번 수정판에는 새로운 SQL이 없습니다. v4.5 SQL을 이미 실행했다면 다시 실행하지 않습니다.

## 2. GitHub Pages 배포

- [ ] ZIP 안의 `hoonnote_v4_5_1` 폴더를 연다.
- [ ] `index.html`만 올리지 말고 폴더 안의 웹 파일 전체를 기존 `/solonote/` 파일과 교체한다.
- [ ] 특히 `css/style.css`, `js/app.js`, `js/pwa.js`, `service-worker.js`가 모두 교체됐는지 확인한다.
- [ ] GitHub Pages 배포 완료 뒤 `https://myunghoon3847-maker.github.io/solonote/?v=451`에 접속한다.
- [ ] 메뉴 하단 `v4.5.1` 표시를 확인한다.

## 3. 설치 앱 업데이트

- [ ] 훈노트를 완전히 닫았다가 다시 연다.
- [ ] 업데이트 안내가 보이면 적용한다.
- [ ] 안내가 없으면 앱을 한 번 더 닫았다가 열거나 브라우저에서 `?v=451` 주소를 먼저 연다.
- [ ] 앱 삭제·재설치는 마지막 수단으로만 사용한다.

## 4. 완료 확인

- [ ] `TEST_CHECKLIST_v4.5.1.md`의 카테고리 UI와 관리 기능 통과
- [ ] 기존 메모·체크리스트·계정 데이터 보존 확인
- [ ] PC와 스마트폰에서 동일하게 표시되는지 확인

## 권장 커밋 메시지

`Fix category manager UI and prevent mixed PWA assets in HoonNote v4.5.1`
