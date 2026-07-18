# 훈노트 v4.4 내부 정적 검수 보고서

검수일: 2026-07-18

## 통과 항목

- 브라우저 JavaScript 파일 문법 검사 통과
- Service Worker JavaScript 문법 검사 통과
- Manifest JSON 파싱 통과
- Android package-values JSON 파싱 통과
- Digital Asset Links 템플릿 JSON 파싱 통과
- HTML 중복 ID 없음
- 내부 HTML/CSS/JS 링크 대상 파일 존재
- 일반·maskable·monochrome·Play Store 아이콘 크기 확인
- 패키지명 `com.hooncompany.hoonnote` 일치
- versionName `1.0.0`, versionCode `1`, target API `36` 준비값 확인
- ZIP에 JKS/keystore/PEM/KEY 등 실제 서명키 파일이 포함되지 않음
- 앱 표시 버전과 캐시 버전 v4.4 적용

## 실제 배포 후 검수가 필요한 항목

- GitHub Pages HTTPS 환경에서 Service Worker 등록
- PWABuilder PWA 점수와 패키지 생성
- 생성된 Android 프로젝트의 target API 36 확인
- AAB 서명 및 Play Console 업로드
- Play App Signing 인증서 지문 확보
- 원본 루트 Digital Asset Links 배포와 검증
- Android 실기기에서 주소창 없는 TWA 실행
- 로그인·동기화·백업·계정 삭제 회귀 테스트

## 제한사항

현재 ZIP은 PWABuilder 입력 준비본입니다. 실제 AAB, APK, 서명키는 생성하지 않았습니다. 서명키는 사용자가 직접 안전하게 생성하고 보관해야 합니다.
