# SoloNote v4.3.2.1 Supabase 회원가입 설정

## 1. 공개 회원가입 허용

Supabase Dashboard에서 프로젝트를 열고 Authentication 설정으로 이동합니다.

- Allow new users to sign up: 켜기
- Confirm Email: 켜기 권장

Confirm Email을 켜면 가입 직후 세션이 생성되지 않고, 사용자가 인증 메일의 링크를 누른 뒤 로그인할 수 있습니다.

## 2. Site URL 설정

SoloNote의 실제 서비스 주소를 Site URL로 등록합니다.

```text
https://myunghoon3847-maker.github.io/solonote/
```

## 3. Redirect URLs 설정

Authentication의 URL Configuration에서 다음 주소를 허용합니다.

```text
https://myunghoon3847-maker.github.io/solonote/
https://myunghoon3847-maker.github.io/solonote/**
```

로컬 테스트가 필요할 때만 아래 주소도 추가합니다.

```text
http://localhost:8000/**
http://127.0.0.1:8000/**
```

## 4. 이메일 발송 확인

가입 테스트 후 다음을 확인합니다.

- 인증 이메일이 도착하는가
- 스팸함으로 들어가지 않는가
- 인증 링크가 SoloNote 주소로 돌아오는가
- 인증 후 로그인할 수 있는가

## 5. 보안 주의

- 앱에는 Publishable Key만 사용합니다.
- Service Role Key나 관리자 비밀 키를 `config.js` 또는 GitHub에 넣지 않습니다.
- 이미 가입된 이메일인지 세세하게 노출하지 않는 안내가 보안상 더 안전합니다.

## 6. 이번 버전에서 하지 않는 작업

- 계정 삭제
- 이용약관 동의
- 개인정보처리방침 링크
- 소셜 로그인
- CAPTCHA

이 항목들은 출시 준비 단계에서 순서대로 추가합니다.
