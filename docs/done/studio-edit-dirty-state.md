# Studio Edit Mode - Dirty State UX 개선 완료

## Beta User 관점 이슈
- 변경하지 않았는데도 `수정안 저장` 버튼이 활성화되어 저장 UX가 모호함
- 단축키 저장(`Cmd/Ctrl+S`, `Cmd/Ctrl+Enter`)도 변경 없음 상태에서 동작할 수 있음

## UX 엔지니어 리뷰 요약
- 저장 가능 상태는 `현재 입력값`과 `마지막 저장/로드 기준값`의 diff로만 판단해야 함
- 버튼 활성화, 단축키 저장, API 호출이 같은 dirty 판단 로직을 공유해야 일관성이 생김

## 개발 반영 사항
- `PostStudio`에 post별 저장 스냅샷(`savedSnapshots`) 추가
- 선택된 post의 dirty 여부(`hasSelectedUnsavedChanges`)를 계산해 저장 UI/동작에 일괄 적용
- 변경 없음 상태에서는 저장 버튼 비활성화 + 저장 단축키 무시 + 저장 API 미호출
- 서버/로컬 저장 직후 스냅샷 갱신으로 dirty 상태 즉시 해제

## 검증
- `pnpm lint` 통과 (기존 warning만 존재)
- `pnpm exec tsc --noEmit` 통과
