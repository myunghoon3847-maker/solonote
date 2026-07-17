# 업무노트 v4.3.2.5 변경 기록

## 수정한 오류

계정 삭제 요청이 브라우저 제한 시간을 초과할 때 발생한 다음 오류를 수정했습니다.

`Cannot set property code of which has only a getter`

브라우저가 생성한 `AbortError`는 `code` 속성이 읽기 전용일 수 있습니다. 기존 코드는 해당 오류 객체의 `code` 속성을 직접 변경해 새로운 TypeError를 발생시켰습니다.

## 변경 내용

- 브라우저 원본 `AbortError`를 수정하지 않음
- 별도의 쓰기 가능한 `Error` 객체를 생성해 `EDGE_FUNCTION_TIMEOUT` 코드 전달
- 시간 초과 후 계정 존재 여부 재확인 흐름 정상 복구
- 계정이 삭제되지 않았으면 실제 시간 초과 안내 표시
- PWA 정적 자산 버전 `4325` 적용

## 서버 변경

이번 버전은 웹앱 오류 처리 수정입니다. 이미 배포한 `delete-account` v4.3.2.4 Edge Function을 다시 배포할 필요는 없습니다.
