# SoloNote v3.4

SoloNote v3.4는 로그인한 사용자의 메모를 Supabase `memos` 테이블에 저장하는 클라우드 버전입니다.

## v3.4 핵심 변경

- 로그인 후 Supabase에서 내 메모 불러오기
- 새 메모 클라우드 저장
- 메모 수정 클라우드 저장
- 중요 표시 저장
- 체크리스트 완료 상태 저장
- 휴지통 이동과 복구
- 완전 삭제
- 휴지통 전체 비우기
- 전체 클라우드 데이터 삭제
- 클라우드 메모 JSON 백업
- JSON 백업 파일을 클라우드에 복원
- 클라우드 연결/저장 상태 표시

## 기존 localStorage 데이터

기존 브라우저 `localStorage` 메모는 삭제하지 않습니다.

v3.4 화면은 Supabase 클라우드 메모만 표시합니다. 기존 브라우저 메모를 옮기려면 이전 버전에서 JSON 백업을 만든 후 v3.4의 `복원하기`를 사용합니다.

## 보안 구조

브라우저에는 Project URL과 publishable key만 들어갑니다.
데이터 접근은 Supabase 로그인 세션과 `memos` 테이블의 RLS 정책으로 제한합니다.

## 테스트 주소

```text
https://myunghoon3847-maker.github.io/solonote/?v=340
```
