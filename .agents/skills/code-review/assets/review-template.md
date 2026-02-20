# 코드 리뷰 결과

**검토 범위**: {{FILES}}
**검토 기준**: Tidy First + Modern SE

## 요약

- High: {{HIGH_COUNT}}
- Medium: {{MEDIUM_COUNT}}
- Low: {{LOW_COUNT}}
- 총 이슈: {{TOTAL_COUNT}}

## Sub-agent 실행 요약 (선택)

- 실행 모드: `single-agent | sub-agent`
- 사용 에이전트: {{AGENTS_USED}}
- 병렬 실행 여부: {{PARALLEL_EXECUTION}}
- 미확인 항목: {{OPEN_QUESTIONS}}

## High Priority

### 1. [{{FILE}}:{{LINE}}] {{TITLE}}

- 분류: {{PRINCIPLE}}
- 문제: {{PROBLEM}}
- 영향: {{IMPACT}}

**Before**
```{{LANG}}
{{BEFORE_CODE}}
```

**After**
```{{LANG}}
{{AFTER_CODE}}
```

- 기대 효과: {{BENEFIT}}

## Medium Priority

### 1. [{{FILE}}:{{LINE}}] {{TITLE}}

- 분류: {{PRINCIPLE}}
- 문제: {{PROBLEM}}
- 제안: {{FIX}}
- 기대 효과: {{BENEFIT}}

## Low Priority

### 1. [{{FILE}}:{{LINE}}] {{TITLE}}

- 분류: {{PRINCIPLE}}
- 제안: {{FIX}}

## 원칙별 관찰

### Tidy First

- Guard Clauses: {{GUARD_SUMMARY}}
- Extract Function: {{EXTRACT_SUMMARY}}
- High Cohesion: {{COHESION_SUMMARY}}
- Low Coupling: {{COUPLING_SUMMARY}}

### Modern SE

- Modularity: {{MODULARITY_SUMMARY}}
- Cohesion: {{SE_COHESION_SUMMARY}}
- Separation of Concerns: {{SOC_SUMMARY}}
- Information Hiding: {{HIDING_SUMMARY}}
- Coupling: {{SE_COUPLING_SUMMARY}}

## 복잡도 분석 (선택)

> TypeScript 코드베이스에서는 `scripts/analyze-complexity.ts` 결과를 반영한다.

- 상위 복잡 함수: {{TOP_COMPLEX_FUNCTIONS}}
- 공통 패턴: {{COMPLEXITY_PATTERN}}

## 실행 순서 제안

1. 즉시 수정(High)부터 처리
2. 재검증 후 Medium 반영
3. Low는 리팩토링 스프린트에 배치

## 테스트 권장

- 우선 테스트 대상: {{TEST_TARGETS}}
- 권장 테스트 유형: {{TEST_TYPES}}

## 참고

- `references/tidy-first.md`
- `references/modern-engineering.md`
- `references/sub-agent-playbook.md`
