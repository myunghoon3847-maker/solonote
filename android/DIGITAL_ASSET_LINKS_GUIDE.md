# Digital Asset Links 설정 — 훈노트

## 중요한 구조

훈노트 웹주소는 프로젝트 경로입니다.

- 앱: `https://myunghoon3847-maker.github.io/solonote/`
- 웹 원본(origin): `https://myunghoon3847-maker.github.io`

TWA 검증 파일은 프로젝트 폴더가 아니라 웹 원본의 루트에 있어야 합니다.

`https://myunghoon3847-maker.github.io/.well-known/assetlinks.json`

따라서 `solonote/.well-known/assetlinks.json`에만 올리면 검증되지 않습니다.

## 설정 순서

1. PWABuilder에서 Android 패키지를 생성합니다.
2. Play Console에 AAB를 업로드하고 Google Play App Signing을 활성화합니다.
3. Play Console의 앱 무결성/App signing 화면에서 **앱 서명 키 인증서 SHA-256 지문**을 복사합니다.
4. 로컬 APK 테스트도 주소창 없이 확인하려면 로컬 또는 업로드 키의 SHA-256 지문도 준비합니다.
5. `android/assetlinks.template.json`의 두 자리표시자를 실제 지문으로 교체합니다.
6. 완성된 파일명을 `assetlinks.json`으로 변경합니다.
7. 사용자 사이트 저장소 `myunghoon3847-maker.github.io`의 `.well-known/assetlinks.json` 위치에 배포합니다.
8. 공개 주소에서 JSON이 로그인 없이 열리는지 확인합니다.

## 지문 사용 기준

- Play Store에서 설치한 앱: **Play 앱 서명 키 인증서** 지문 필요
- 직접 설치한 테스트 APK: 해당 APK를 실제로 서명한 키 지문 필요

두 환경을 모두 테스트할 때는 두 지문을 배열에 함께 넣습니다.

## 완료 기준

- 공개 주소 응답이 HTTP 200
- Content-Type이 JSON 또는 일반 텍스트여도 JSON 내용이 손상되지 않음
- package_name이 `com.hooncompany.hoonnote`
- SHA-256 지문에 공백이나 누락이 없음
- 앱 실행 시 주소창이 나타나지 않음
