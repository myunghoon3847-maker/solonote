# 훈노트 v4.5.5 배포 체크리스트

## 배포 전

- [ ] 현재 운영 메모를 JSON으로 백업한다.
- [ ] 기존 GitHub Pages 파일을 별도 폴더에 보관한다.
- [ ] `node --test tests/security-regression.test.js`가 통과하는지 확인한다.

## 웹 배포

- [ ] `hoonnote_v4_5_5` 폴더 내부 전체를 `/solonote/`에 덮어쓴다.
- [ ] GitHub Pages 배포 완료를 기다린다.
- [ ] `https://myunghoon3847-maker.github.io/solonote/?v=455`를 연다.
- [ ] 메뉴 하단 `v4.5.5`를 확인한다.
- [ ] PWA 업데이트 안내를 적용한다.
- [ ] `TEST_CHECKLIST_v4.5.5.md`를 실행한다.

## Android 주소 표시가 남는 경우

- [ ] Play Console에서 앱 서명 키 인증서 SHA-256을 복사한다.
- [ ] `android/assetlinks.template.json`의 자리표시자를 실제 지문으로 교체한다.
- [ ] 완성 파일을 사용자 사이트 루트 저장소의 `.well-known/assetlinks.json`으로 배포한다.
- [ ] 공개 URL에서 파일이 인증 없이 열리는지 확인한다.
- [ ] Play 앱을 삭제 후 다시 설치하여 TWA 검증을 재확인한다.

## 롤백

- [ ] 문제가 생기면 보관한 v4.5.4 파일 전체로 되돌린다.
- [ ] 서비스워커 업데이트 후 메뉴 하단 버전을 확인한다.
- [ ] 데이터는 삭제하지 말고 필요한 경우 JSON 백업을 추가 복원한다.

## 권장 커밋

`Improve HoonNote home navigation, mobile UI and category editing for v4.5.5`
