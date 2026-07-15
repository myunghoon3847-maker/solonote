# Supabase 준비 순서

## 1. Supabase 가입

Supabase에 가입합니다.

## 2. 새 프로젝트 생성

추천 프로젝트 이름:

```text
solonote
```

## 3. 비밀번호 저장

Supabase 프로젝트 DB 비밀번호는 나중에 필요할 수 있으니 안전하게 보관합니다.

## 4. Project URL 확인

Supabase 프로젝트 설정에서 Project URL을 확인합니다.

예시:

```text
https://xxxxxxx.supabase.co
```

## 5. anon public key 확인

Project API Keys에서 anon public key를 확인합니다.

이 키는 프론트엔드에서 Supabase에 연결할 때 사용합니다.

## 6. Authentication 설정

처음에는 이메일 + 비밀번호 로그인만 사용합니다.

추천:
- Email login 사용
- 외부 소셜 로그인은 아직 사용하지 않음
- 공개 회원가입은 처음에는 신중하게 운영

## 7. Database SQL 실행

`sql/create_memos_table.sql` 파일 내용을 Supabase SQL Editor에 붙여넣고 실행합니다.

## 주의

Supabase URL과 anon key는 코드에 들어가지만, service role key는 절대 공개 코드에 넣으면 안 됩니다.
