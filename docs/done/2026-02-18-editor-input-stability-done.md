# 2026-02-18 Editor Input Stability Done

## scope
- Post editor 입력 안정성 이슈 분석 및 수정
- React Compiler 기본 동작을 OFF(옵트인)로 전환
- 에디터 입력 시나리오 E2E 추가 및 studio E2E 실패 원인 분석/해결

## completed slices
- React Compiler 기본 OFF 전환
  - `next.config.ts`에서 `REACT_COMPILER === 'true'`일 때만 활성화하도록 변경
- Editor 입력 안정성 E2E 시나리오 추가
  - `tests/e2e/editor-input.spec.ts`
  - 시나리오: 빠른 영문 입력, 한글 입력, 중간 커서 삽입, 대용량 paste + backspace
- Studio E2E 시나리오 현행 UI 정합화
  - `tests/e2e/studio.spec.ts`
  - 대시보드 진입 경로(`클릭해서 보기`), preview->edit 전환, command palette 검색 흐름 반영
- 실제 버그 수정 (로컬 입력 덮어쓰기 race)
  - `src/components/blog/PostStudio.tsx`
  - 비동기 본문 로드 응답이 늦게 도착했을 때 사용자가 입력한 title/content를 서버 응답으로 덮어쓰는 문제 방지
  - `hasLocalDraftChangesRef` 도입 및 로드 응답 병합 로직 보호

## verification evidence
- 입력 시나리오 E2E
  - `pnpm exec playwright test tests/e2e/editor-input.spec.ts --project=chromium`
  - 결과: 4 passed
- Studio 시나리오 E2E
  - `pnpm exec playwright test tests/e2e/studio.spec.ts --project=chromium`
  - 결과: 3 passed
- 통합 재실행
  - `pnpm exec playwright test tests/e2e/editor-input.spec.ts tests/e2e/studio.spec.ts --project=chromium`
  - 결과: 7 passed

## unresolved risks
- 실제 사용자 환경의 한글 IME 조합 입력은 Playwright 자동 입력과 100% 동일하지 않음
  - 수동 QA(맥/윈도우, 한/영 전환, 조합 중 커서 이동) 추가 확인 권장
- Next dev에서 `127.0.0.1 -> /_next/*` cross origin warning 발생
  - 향후 `allowedDevOrigins` 설정 검토 필요
- `playwright-report` 산출물이 워크스페이스에 남아 있으면 ESLint 범위에 포함되어 대량 경고/에러 유발 가능
  - lint 대상 제외 또는 리포트 정리 정책 필요

## next actions
- 수동 IME 회귀 체크리스트 기반 크로스플랫폼 점검(특히 macOS 한글 조합)
- CI에서 editor/studio E2E를 분리 잡으로 상시 실행
- lint 대상에서 E2E 산출물(`playwright-report`, `test-results`) 제외 정리
