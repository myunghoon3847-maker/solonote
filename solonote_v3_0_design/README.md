# SoloNote v3.0

SoloNote v3.0은 기존 v2.5 개인용 MVP 안정판을 기반으로, 혼자 쓰는 로그인형 클라우드 노트로 확장하기 위한 설계 버전입니다.

## v3.0 방향

- 사용 목적: 나 혼자 로그인해서 PC와 스마트폰에서 같은 메모를 보기
- 백엔드: Supabase
- 로그인: 이메일 + 비밀번호
- 데이터베이스: Supabase PostgreSQL
- 기존 데이터 이전: v2.5 백업 JSON 파일을 v3.x에서 가져와 DB에 저장

## 중요한 원칙

v2.5는 안정판으로 유지합니다.
v3.x는 서버 연결 실험판으로 따로 진행합니다.

즉, v3에서 문제가 생겨도 v2.5로 돌아갈 수 있어야 합니다.

## v3.0 파일 구성

- README.md: v3.0 전체 방향
- docs/V3_ROADMAP.md: v3 개발 순서
- docs/SUPABASE_SETUP.md: Supabase 준비 순서
- docs/DATABASE_DESIGN.md: DB 구조 설명
- docs/MIGRATION_PLAN.md: 기존 localStorage 데이터 이전 계획
- sql/create_memos_table.sql: Supabase에 만들 memos 테이블 SQL 초안

## 다음 단계

v3.1에서 Supabase 프로젝트를 만들고, 이 설계를 기준으로 실제 연결 준비를 진행합니다.
