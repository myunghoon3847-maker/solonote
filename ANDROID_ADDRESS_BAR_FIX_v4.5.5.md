# Android 상단 주소·링크 표시 제거 — v4.5.5

## 먼저 구분하기

### 일반 모바일 브라우저

Chrome·Safari에서 웹주소로 직접 접속하면 브라우저 주소창은 보안상 웹페이지 코드로 강제 삭제할 수 없습니다. 훈노트는 홈 화면에 PWA로 설치하면 `standalone` 모드로 실행되도록 설정되어 있습니다.

### Google Play에서 설치한 훈노트 앱

앱 상단에 `myunghoon3847-maker.github.io` 같은 주소 또는 링크 형식이 표시되면 TWA의 Digital Asset Links 검증이 실패해 Custom Tab으로 열린 상태일 가능성이 큽니다.

## 필요한 값

- Android 패키지명: `com.hooncompany.hoonnote`
- 웹 원본: `https://myunghoon3847-maker.github.io`
- 앱 시작 경로: `/solonote/`
- Play Console의 **앱 서명 키 인증서 SHA-256 지문**

업로드 키가 아니라 Play가 실제 사용자 앱에 적용하는 앱 서명 키 지문을 사용해야 합니다. 직접 설치한 APK도 함께 검사할 때만 해당 APK 서명 지문을 배열에 추가합니다.

## 배포 파일 위치

아래 위치에 정확히 배포해야 합니다.

`https://myunghoon3847-maker.github.io/.well-known/assetlinks.json`

`/solonote/.well-known/`가 아니라 GitHub Pages 사용자 사이트의 원본 루트입니다. 따라서 현재 `/solonote/` 프로젝트 저장소만 수정해서는 해결되지 않을 수 있습니다.

## 파일 작성

1. Play Console에서 앱 서명 키 SHA-256을 복사합니다.
2. `android/assetlinks.template.json`을 복사합니다.
3. `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`을 실제 지문으로 교체합니다.
4. 로컬 APK 지문을 사용하지 않는다면 두 번째 자리표시자 줄과 앞의 쉼표를 삭제합니다.
5. 파일 이름을 `assetlinks.json`으로 바꿉니다.
6. `myunghoon3847-maker.github.io` 사용자 사이트 저장소의 `.well-known/` 폴더에 올립니다.

## 최종 확인

- 공개 URL이 로그인 없이 HTTP 200으로 열린다.
- JSON 안의 패키지명이 `com.hooncompany.hoonnote`다.
- SHA-256 지문이 Play Console 앱 서명 키와 완전히 같다.
- 앱을 삭제하고 Play 테스트 링크에서 다시 설치한다.
- 앱 실행 시 상단 주소 표시가 사라진다.

## 이번 수정본에서 완료한 부분

- 웹 앱 Manifest의 `standalone` 실행 설정 유지
- PWA 모바일 화면과 상단 헤더 최적화
- Digital Asset Links 템플릿과 루트 배포 구조 유지

실제 지문은 보안상 추측하거나 임의로 작성할 수 없으므로 Play Console에서 복사한 값이 필요합니다.
