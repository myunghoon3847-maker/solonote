# SoloNote v3.3

SoloNote v3.3은 Supabase Auth를 이용한 **혼자 쓰는 로그인 기능 실험판**입니다.

## 연결된 Supabase 프로젝트

- Project URL: `https://nxobwqvsqvowimherzlo.supabase.co`
- 키 종류: publishable key
- Secret key, service_role key, 로그인 비밀번호는 포함하지 않음

## v3.3 추가 기능

- 이메일 + 비밀번호 로그인
- 기존 로그인 세션 유지
- 로그아웃
- 로그인하지 않은 상태에서는 SoloNote 화면 숨김
- 로그인 이메일 표시
- 로그인 오류 안내
- 외부 Supabase 요청을 PWA 캐시에서 제외

## 매우 중요한 현재 상태

v3.3에서는 **로그인만 Supabase에 연결**되어 있습니다.

메모 작성, 수정, 삭제, 체크리스트, 백업 기능의 데이터는 아직 브라우저 `localStorage`에 저장됩니다. 따라서 같은 계정으로 다른 기기에서 로그인해도 메모는 아직 자동 동기화되지 않습니다.

메모 DB 저장과 기기 간 동기화는 다음 단계인 v3.4에서 연결합니다.

## 테스트 주소

```text
https://myunghoon3847-maker.github.io/solonote/?v=330
```
