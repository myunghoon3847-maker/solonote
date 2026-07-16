# SoloNote v3.7

SoloNote v3.7은 비밀번호를 잊었을 때 이메일을 통해 계정을 복구하는 버전입니다.

## v3.7 추가 기능

- 로그인 화면의 `비밀번호를 잊으셨나요?` 버튼
- Supabase 계정 이메일로 재설정 링크 발송
- 재설정 링크로 SoloNote에 돌아오면 새 비밀번호 화면 표시
- 새 비밀번호와 확인 비밀번호 일치 검사
- 앱 기준 최소 8자 검사
- `updateUser()`를 통한 새 비밀번호 저장
- 변경 완료 후 로그아웃하고 새 비밀번호로 다시 로그인
- 만료되거나 잘못된 링크 안내
- 이메일 발송·비밀번호 저장 버튼 중복 클릭 방지
- 비밀번호 복구 중 메모 앱과 클라우드 데이터 화면 차단

## 필요한 Supabase 설정

Authentication → URL Configuration → Redirect URLs에 다음 주소가 등록되어 있어야 합니다.

```text
https://myunghoon3847-maker.github.io/solonote/
```

## 재설정 흐름

1. 로그인 화면에서 `비밀번호를 잊으셨나요?`를 누릅니다.
2. Supabase에 등록한 이메일을 입력합니다.
3. 받은 이메일에서 재설정 링크를 누릅니다.
4. SoloNote의 새 비밀번호 화면에서 8자 이상 비밀번호를 입력합니다.
5. 완료 후 새 비밀번호로 다시 로그인합니다.

## 테스트 주소

```text
https://myunghoon3847-maker.github.io/solonote/?v=370
```
