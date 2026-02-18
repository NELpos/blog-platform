# Studio Workflow Test Protocol

## Scope
- 대상: 글 작성, 저장, 버전 선택 배포, 게시 해제, 삭제, 포스트 이동
- 페이지: `/studio`, `/dashboard`, `/blog/[workspace_slug]/[post_slug]`

## Preconditions
- 로그인된 작성자 계정
- `post_versions` 마이그레이션 적용된 DB
- 테스트용 포스트 2개 이상

## Test Cases

### 1) 신규 작성 저장
1. `/studio/new`로 새 포스트 생성
2. 제목/본문 입력 후 `저장`
3. `뷰` 전환

Expected:
- 저장 성공 토스트 표시
- 헤더 버전 선택에 `v1` 표시
- 뷰 본문이 저장한 내용과 동일

### 2) 비우기 후 재입력 저장 (회귀 핵심)
1. Edit에서 본문 전체 삭제
2. 2초 대기(임시저장 발생 구간)
3. 원문 다시 붙여넣기
4. `저장` 클릭
5. `뷰` 전환

Expected:
- 빈 내용이 아닌, 재입력한 최종 본문이 저장됨
- 최신 버전(vN)이 생성되고 기본 선택됨

### 3) 저장 후 즉시 배포
1. Edit에서 일부 수정
2. `저장` 후 `뷰` 전환
3. 헤더 `게시` 클릭

Expected:
- 방금 저장한 최신 버전이 배포됨
- Public View에서 최신 수정본 노출

### 4) 구버전 선택 배포(롤백)
1. 헤더 버전 선택에서 이전 버전(vN-1) 선택
2. `게시` 클릭
3. Public View 열기

Expected:
- 선택한 이전 버전 내용이 공개본으로 반영
- 드롭다운에서 해당 버전에 `공개중` 표시

### 5) 게시 해제
1. 게시된 포스트에서 `게시 해제` 클릭
2. Public View 진입 시도

Expected:
- 공개 페이지에서 더 이상 노출되지 않음
- Studio 상태 문구가 비공개 상태로 변경

### 6) Draft 삭제
1. 비공개 상태 포스트에서 `삭제` 클릭

Expected:
- 포스트 제거됨
- 커맨드 팔레트/목록에서도 사라짐

### 7) 포스트 이동 시 자동 저장
1. Edit에서 저장하지 않고 내용 수정
2. `Cmd/Ctrl+K`로 다른 포스트 선택

Expected:
- 이동 전 자동 저장 시도
- 저장 실패 시 이동 취소 + 에러 토스트

### 8) Bulk 게시 해제 정합성
1. `/dashboard`에서 게시된 글 여러 개 선택
2. Bulk Unpublish 실행
3. 각 포스트 `/studio` 진입

Expected:
- 모두 비공개 상태
- 버전 선택 항목은 유지되되, 공개중 표시는 없어야 함

### 9) 복사 버튼
1. View에서 우측 상단 `복사` 클릭
2. 외부 에디터에 붙여넣기

Expected:
- 현재 뷰에서 보고 있는 버전의 마크다운이 복사됨

### 10) 단축키/상태 표시 가시성
1. Edit/View 각각 확인

Expected:
- Edit: 저장 상태 + Shortcuts 표시
- View: 저장 상태/Shortcuts 미표시, 배포 액션만 표시

## Regression Focus
- 저장 직후 최신 버전 자동 선택 유지
- 저장 후 즉시 배포 시 최신 버전 배포
- empty->retype 저장 시 stale payload 방지
- unpublish 시 `published_version_id` 정리

## Pass Criteria
- 10개 케이스 모두 Expected 충족
- Public View 공개본이 배포 선택 버전과 항상 일치
