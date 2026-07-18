# 훈노트 v4.4 변경 기록

## 목적

PWABuilder 기반 TWA Android 패키징과 Google Play 내부 테스트를 준비합니다.

## 웹앱 변경

- Manifest에 `id`, `scope`, 세로 방향, 생산성 카테고리 추가
- Android 패키지명 `com.hooncompany.hoonnote` 관련 앱 정보 추가
- 일반·maskable·monochrome 아이콘 분리
- SoloNote 시절의 S 아이콘을 훈노트 H 아이콘으로 교체
- TWA 실행 감지 시 앱 설치 버튼과 설치 도움말 숨김
- 서비스워커 캐시 버전을 `hoonnote-v4-4-cache`로 갱신
- 앱 표시 버전을 `v4.4`로 갱신
- 계정 삭제 요청의 클라이언트 버전만 `4.4`로 갱신

## Android 준비 파일

- `android/package-values.json`
- `android/PWABUILDER_INPUT.md`
- `android/assetlinks.template.json`
- `android/DIGITAL_ASSET_LINKS_GUIDE.md`
- `android/SIGNING_KEY_SAFETY.md`
- `android/PLAY_INTERNAL_TEST_GUIDE.md`
- `github-pages-origin-root-template/.well-known/assetlinks.template.json`

## 변경하지 않은 항목

- Supabase 테이블과 RLS
- 계정 삭제 Edge Function 본체 버전
- 메모 저장·동기화 구조
- 개인정보처리방침 및 이용약관의 본문
