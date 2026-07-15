# SoloNote v3.0 데이터베이스 설계

처음에는 복잡하게 나누지 않고 `memos` 테이블 하나로 시작합니다.

## memos 테이블

| 컬럼명 | 의미 |
|---|---|
| id | 메모 고유 ID |
| user_id | 로그인한 사용자 ID |
| title | 메모 제목 |
| content | 메모 내용 |
| category | 카테고리 |
| project | 프로젝트명 |
| is_important | 중요 메모 여부 |
| is_deleted | 휴지통 여부 |
| tasks | 체크리스트 JSON |
| created_at | 작성일 |
| updated_at | 수정일 |

## tasks 저장 방식

체크리스트는 처음에는 별도 테이블로 나누지 않고 JSON 형태로 저장합니다.

예시:

```json
[
  {
    "id": "task-1",
    "text": "Supabase 연결하기",
    "done": false
  }
]
```

## 왜 tasks를 JSON으로 저장하나?

현재 v2.5 구조와 가장 비슷해서 이전이 쉽습니다.
나중에 협업, 통계, 반복 할 일 같은 기능이 필요해지면 별도 테이블로 분리할 수 있습니다.
