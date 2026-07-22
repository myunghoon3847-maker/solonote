# 훈노트 v4.5 배포 체크리스트

## 1. 배포 전

- [ ] 운영 계정 JSON 백업
- [ ] `05_create_memo_categories.sql` 전체 실행
- [ ] 테이블 1개, 함수 2개, RLS 정책 4개 확인
- [ ] v4.4 원본 ZIP 별도 보관

## 2. 웹 배포

- [ ] v4.5 파일을 GitHub Pages 저장소에 업로드
- [ ] `https://myunghoon3847-maker.github.io/solonote/?v=450` 접속
- [ ] 화면 버전 `v4.5` 확인
- [ ] 브라우저와 설치 앱에서 업데이트 확인

## 3. 기능 확인

- [ ] 카테고리 추가·이름 변경·삭제
- [ ] 삭제 후 메모 `미분류` 이동
- [ ] 기존 메모와 체크리스트 보존
- [ ] PC·스마트폰 동기화
- [ ] JSON 백업·복원

## 4. 비공개 테스트 기록

- [ ] 변경일과 SQL 실행 시각 기록
- [ ] 테스터에게 카테고리 기능 검수 요청
- [ ] 오류 내용·기기·브라우저·재현 순서 기록
- [ ] 치명적 오류가 없을 때 v4.5 확정

## 권장 커밋 메시지

`Add synced category management with safe memo migration in HoonNote v4.5`
