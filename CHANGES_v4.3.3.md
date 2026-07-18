# 훈노트 v4.3.3 변경 기록

## 브랜드
- 앱 이름을 훈노트(HoonNote)로 통일
- PWA 이름, 브라우저 제목, 로그인, 앱 상단, 메뉴, 계정 삭제 문구 변경

## 정책·지원
- `legal/privacy.html`: 개인정보처리방침
- `legal/terms.html`: 이용약관
- `support/delete-account.html`: 외부 계정·데이터 삭제 요청 안내
- `support/index.html`: 고객지원 및 FAQ
- `legal/legal.css`: 정책·지원 공통 반응형 스타일

## 회원가입
- 개인정보 수집·이용 요약 제공
- 이용약관 필수 동의
- 개인정보처리방침 확인 및 수집·이용 필수 동의
- 만 14세 이상 필수 확인
- 세 항목을 모두 선택해야 회원가입 버튼 활성화

## PWA
- 정책·지원 페이지 사전 캐시
- 정책 페이지 탐색 응답이 앱 `index.html` 캐시를 덮어쓰던 가능성 제거
- 캐시 버전 `hoonnote-v4-3-3-cache`
