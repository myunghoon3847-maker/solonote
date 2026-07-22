# 훈노트 v4.5.3 배포 체크리스트

## 배포 전

- [ ] 운영 메모를 JSON으로 백업한다.
- [ ] v4.5.2 정상 배포본 ZIP을 롤백용으로 보관한다.
- [ ] `node --test tests/security-regression.test.js`가 통과한다.
- [ ] 이번 버전에는 적용할 DB 변경 SQL이 없음을 확인한다.

## GitHub Pages

- [ ] `hoonnote_v4_5_3` 폴더 내부 파일 전체를 기존 `/solonote/` 파일과 교체한다.
- [ ] `index.html`뿐 아니라 `js`, `css`, `service-worker.js`, 정책·지원 페이지를 함께 교체한다.
- [ ] 배포 후 `https://myunghoon3847-maker.github.io/solonote/?v=453`에 접속한다.
- [ ] 메뉴 하단 `v4.5.3` 표시를 확인한다.
- [ ] 개발자 도구에 JavaScript·서비스워커 오류가 없는지 확인한다.

## 설치 앱

- [ ] 업데이트 안내가 표시되면 적용한다.
- [ ] 안내가 없으면 브라우저에서 `?v=453` 주소를 먼저 열고 앱을 다시 실행한다.
- [ ] `TEST_CHECKLIST_v4.5.3.md`를 스마트폰에서 확인한다.

## 롤백

1. 치명적 오류가 있으면 v4.5.2 파일 전체를 다시 배포한다.
2. `?v=452`에서 화면 버전을 확인한다.
3. 서비스워커 업데이트 안내를 적용하고 앱을 다시 실행한다.
4. 이번 버전은 DB를 변경하지 않으므로 데이터베이스 롤백은 없다.

## 권장 Git

- 커밋: `Harden backup restore and user-scoped cloud access in HoonNote v4.5.3`
- 태그: `v4.5.3`
