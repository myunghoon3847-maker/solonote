# 훈노트 v4.5.13

훈노트 v4.5.13은 v4.5.12 UI를 기준으로 로그인, 메모, 카테고리, 할 일, 휴지통, 백업, 계정 관리와 자동 초안을 연속 검수한 핵심 기능 회귀 안정화 버전입니다.

## 주요 결과

- 보안·정적 회귀 테스트 7/7 통과
- 모의 Supabase 핵심 기능 검사 17/17 통과
- 320~430px 모바일 UI 검사 통과
- 재현 가능한 핵심 기능 회귀 오류 없음

## 자동 검사

```bash
node --test tests/security-regression.test.js
python tests/mobile-ui-smoke.py
python tests/core-regression-v4.5.13.py
```

브라우저 자동 검사는 Python Playwright와 `/usr/bin/chromium` 환경을 사용합니다.

## 배포

ZIP 내부 파일 전체를 기존 GitHub Pages 파일과 교체한 뒤 아래 주소에서 확인합니다.

```text
https://myunghoon3847-maker.github.io/solonote/?v=463
```

메뉴 하단 버전 표시는 `v4.5.13`입니다.

## 다음 단계

실제 Supabase 계정과 두 기기를 사용한 데이터 안전성·동시 수정 검수(v4.5.14)를 진행합니다.
