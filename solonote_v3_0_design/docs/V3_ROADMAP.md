# SoloNote v3 개발 로드맵

## v3.0

서버 / DB / 로그인 구조 설계

## v3.1

Supabase 프로젝트 생성 준비

할 일:
- Supabase 가입
- 새 프로젝트 생성
- 프로젝트 URL 확인
- anon public key 확인
- DB 접근 준비

## v3.2

DB 테이블 생성

할 일:
- memos 테이블 생성
- user_id 컬럼 추가
- tasks JSON 컬럼 추가
- RLS 보안 정책 설정

## v3.3

로그인 화면 추가

할 일:
- 이메일 로그인 화면 만들기
- 로그아웃 버튼 만들기
- 로그인 상태 확인
- 로그인 전/후 화면 분리

## v3.4

메모 저장 위치 변경

기존:
localStorage 저장

변경:
Supabase DB 저장

## v3.5

백업 JSON → DB 가져오기

할 일:
- v2.5 백업 JSON 선택
- JSON 안의 memos 읽기
- 로그인한 사용자 DB에 업로드

## v3.6

PC / 스마트폰 동기화 테스트

확인:
- PC에서 작성한 메모가 스마트폰에서 보이는지
- 스마트폰에서 수정한 메모가 PC에서 보이는지
