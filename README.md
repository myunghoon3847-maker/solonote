# 훈노트 v4.4

훈노트(HoonNote) v4.4는 기존 클라우드 메모 기능과 정책 페이지를 유지하면서 PWABuilder 기반 TWA Android 패키징 및 Google Play 내부 테스트를 준비한 버전입니다.

## 확정 Android 값

- Android 표시 이름: 훈노트
- 패키지명: `com.hooncompany.hoonnote`
- versionName: `1.0.0`
- versionCode: `1`
- target API: `36`
- 배포 형식: `AAB`
- 앱 서명: Google Play App Signing
- 테스트 단계: 내부 테스트

## 이번 ZIP에 포함된 범위

- GitHub Pages에 배포할 v4.4 웹앱
- Android용 일반·maskable·monochrome H 아이콘
- PWABuilder 입력값
- Digital Asset Links 템플릿과 배포 안내
- Play 내부 테스트 체크리스트

## 아직 포함되지 않은 것

실제 AAB, APK, 서명키는 포함되어 있지 않습니다. AAB는 v4.4 웹앱을 먼저 배포한 뒤 PWABuilder에서 생성해야 하며, 서명키는 사용자 본인이 안전하게 생성·보관해야 합니다.

## 배포 확인 주소

`https://myunghoon3847-maker.github.io/solonote/?v=440`

## 시작 문서

1. `android/PWABUILDER_INPUT.md`
2. `android/DIGITAL_ASSET_LINKS_GUIDE.md`
3. `TEST_CHECKLIST_v4.4.md`
4. `RELEASE_CHECKLIST_v4.4.md`
