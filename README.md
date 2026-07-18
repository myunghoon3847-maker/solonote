# 훈노트 v4.3.3

훈노트(HoonNote) v4.3.3은 v4.3.2.6의 메모·동기화·휴지통·계정 삭제 기능을 유지하면서 출시용 정책 페이지와 고객지원 경로를 추가한 출시 준비판입니다.

## 확정 브랜드 정보

- 서비스명: 훈노트
- 영문명: HoonNote
- Google Play 제목: 훈노트 - 1인 업무·아이디어 노트
- Google Play 개발자명: 훈컴퍼니
- 운영자: 김명훈
- 문의: myunghoon3847@gmail.com
- 대상: 만 14세 이상의 일반 사용자

## v4.3.3 주요 변경

- 개인정보처리방침 웹페이지 추가
- 이용약관 웹페이지 추가
- 계정 및 데이터 삭제 안내 웹페이지 추가
- 고객지원·FAQ 웹페이지 추가
- 앱 메뉴에 정책·지원 링크 추가
- 로그인 화면에 정책·지원 링크 추가
- 회원가입 필수 동의 3종 추가
  - 이용약관
  - 개인정보 수집·이용 및 개인정보처리방침 확인
  - 만 14세 이상 확인
- 앱과 PWA 표시 이름을 훈노트로 통일
- 정책 페이지가 앱 화면으로 잘못 캐시되지 않도록 서비스워커 탐색 캐시 로직 수정
- PWA 캐시 및 정적 자산 버전 `433` 적용

## 공개 페이지 주소

배포 후 아래 주소를 사용합니다.

- 개인정보처리방침: `https://myunghoon3847-maker.github.io/solonote/legal/privacy.html`
- 이용약관: `https://myunghoon3847-maker.github.io/solonote/legal/terms.html`
- 계정 삭제 안내: `https://myunghoon3847-maker.github.io/solonote/support/delete-account.html`
- 고객지원: `https://myunghoon3847-maker.github.io/solonote/support/`

## 배포 확인

`https://myunghoon3847-maker.github.io/solonote/?v=433`

## 서버 변경

- `memos` 테이블 변경 없음
- 새로운 SQL 없음
- RLS 변경 없음
- `delete-account` Edge Function 재배포 불필요

## 출시 전 확인

`PRIVACY_POLICY_REVIEW_NOTES.md`와 `RELEASE_CHECKLIST_v4.3.3.md`를 확인하세요.
