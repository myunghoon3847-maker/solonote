# PWABuilder 입력값 — 훈노트 웹 v4.5.7

## 시작 전

1. 이 v4.5.7 웹앱을 GitHub Pages에 먼저 배포합니다.
2. 아래 주소가 모두 정상인지 확인합니다.
   - 앱: https://myunghoon3847-maker.github.io/solonote/
   - Manifest: https://myunghoon3847-maker.github.io/solonote/manifest.json
   - Service Worker: https://myunghoon3847-maker.github.io/solonote/service-worker.js
3. 그다음 PWABuilder에서 앱 주소를 검사하고 Android 패키지를 생성합니다.

## 고정 입력값

- Package ID: `com.hooncompany.hoonnote`
- App name: `훈노트`
- Launcher name: `훈노트`
- Start URL: `https://myunghoon3847-maker.github.io/solonote/`
- Version name: `1.0.0`
- Version code: `1`
- Target SDK: `36`
- Build format: `AAB`
- Signing: Google Play App Signing 사용
- Release: Google Play 내부 테스트

## 아이콘

- 일반 아이콘: `icons/icon-512.png`
- Maskable 아이콘: `icons/icon-maskable-512.png`
- Play Store 아이콘: `icons/play-store-icon-512.png`

## 주의

- 서명키, 키 비밀번호, 인증서 파일은 GitHub와 채팅에 올리지 않습니다.
- PWABuilder가 만든 Android 프로젝트에서 `targetSdkVersion` 또는 `targetSdk`가 36인지 최종 확인합니다.
- 최초 AAB 생성 후 Play Console의 앱 서명 인증서 SHA-256 지문을 확인한 뒤 Digital Asset Links를 완성합니다.


> Google Play에 새 AAB를 올릴 때 Version code는 Play Console에 등록된 현재 값보다 큰 숫자로 직접 설정해야 합니다. 웹 버전 4.5.7만 배포하는 경우 새 AAB는 필수가 아닙니다.
