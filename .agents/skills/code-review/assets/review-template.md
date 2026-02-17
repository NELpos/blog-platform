# 코드 리뷰 결과

**검토 일시**: {{TIMESTAMP}}
**검토 범위**: {{FILES}}
**검토자**: Claude Code (code-review skill)

---

## 요약

| 분류 | 개수 |
|------|------|
| High Priority | {{HIGH_COUNT}} |
| Medium Priority | {{MEDIUM_COUNT}} |
| Low Priority | {{LOW_COUNT}} |
| **총 발견 사항** | **{{TOTAL_COUNT}}** |

### 전체 품질 점수

- **Tidy First 준수율**: {{TIDY_SCORE}}%
- **Modern SE 준수율**: {{MODERN_SCORE}}%
- **종합 점수**: {{OVERALL_SCORE}}%

### 점수 산정 기준

- 90% 이상: 우수 ✅
- 70-89%: 양호 ⚠️
- 50-69%: 개선 필요 ⚠️⚠️
- 50% 미만: 즉시 개선 필요 ❌

---

## High Priority Issues

> **즉시 수정을 권장합니다.** 버그 가능성이 있거나 테스트 불가능한 구조입니다.

### 1. [{{FILE_NAME}}:{{LINE}}] {{ISSUE_TITLE}}

**분류**: {{CATEGORY}} (예: Tidy First - Guard Clauses, Modern SE - Low Coupling)

**위치**: `{{FILE_PATH}}:{{LINE_START}}-{{LINE_END}}`

**문제점**:
{{DESCRIPTION}}

**개선 제안**:

**Before**:
```{{LANG}}
{{BEFORE_CODE}}
```

**After**:
```{{LANG}}
{{AFTER_CODE}}
```

**개선 효과**:
- ✅ {{BENEFIT_1}}
- ✅ {{BENEFIT_2}}
- ✅ {{BENEFIT_3}}

**참고 자료**:
- Tidy First 가이드: `references/tidy-first.md#{{ANCHOR}}`
- Modern SE 가이드: `references/modern-engineering.md#{{ANCHOR}}`

---

### 2. [{{FILE_NAME}}:{{LINE}}] {{ISSUE_TITLE}}

(동일한 형식으로 반복)

---

## Medium Priority Issues

> **다음 리팩토링 시 포함하면 좋습니다.** 가독성과 유지보수성을 향상시킵니다.

### 1. [{{FILE_NAME}}:{{LINE}}] {{ISSUE_TITLE}}

**분류**: {{CATEGORY}}

**위치**: `{{FILE_PATH}}:{{LINE_START}}-{{LINE_END}}`

**문제점**:
{{DESCRIPTION}}

**개선 제안**:

**Before**:
```{{LANG}}
{{BEFORE_CODE}}
```

**After**:
```{{LANG}}
{{AFTER_CODE}}
```

**개선 효과**:
- {{BENEFIT_1}}
- {{BENEFIT_2}}

---

## Low Priority Suggestions

> **시간 여유가 있을 때 적용하면 좋습니다.** 코드 품질을 더욱 향상시킵니다.

### 1. [{{FILE_NAME}}:{{LINE}}] {{ISSUE_TITLE}}

**분류**: {{CATEGORY}}

**위치**: `{{FILE_PATH}}:{{LINE_START}}-{{LINE_END}}`

**제안**:
{{SUGGESTION}}

---

## 원칙별 상세 분석

### Tidy First 원칙 준수도

| 원칙 | 준수율 | 발견 사항 |
|------|--------|-----------|
| Guard Clauses | {{GUARD_CLAUSES_SCORE}}% | {{GUARD_CLAUSES_COUNT}}개 |
| Extract Function | {{EXTRACT_FUNCTION_SCORE}}% | {{EXTRACT_FUNCTION_COUNT}}개 |
| High Cohesion | {{COHESION_SCORE}}% | {{COHESION_COUNT}}개 |
| Low Coupling | {{COUPLING_SCORE}}% | {{COUPLING_COUNT}}개 |

### Modern SE 원칙 준수도

| 원칙 | 준수율 | 발견 사항 |
|------|--------|-----------|
| Modularity | {{MODULARITY_SCORE}}% | {{MODULARITY_COUNT}}개 |
| Cohesion | {{SE_COHESION_SCORE}}% | {{SE_COHESION_COUNT}}개 |
| Separation of Concerns | {{SOC_SCORE}}% | {{SOC_COUNT}}개 |
| Information Hiding | {{HIDING_SCORE}}% | {{HIDING_COUNT}}개 |
| Coupling | {{SE_COUPLING_SCORE}}% | {{SE_COUPLING_COUNT}}개 |

---

## 파일별 요약

### {{FILE_1}}

- **검토 라인 수**: {{LINES}}줄
- **발견 사항**: High {{HIGH}}, Medium {{MEDIUM}}, Low {{LOW}}
- **주요 이슈**:
  - {{ISSUE_1}}
  - {{ISSUE_2}}

### {{FILE_2}}

(동일한 형식으로 반복)

---

## 복잡도 분석 (선택)

> 이 섹션은 `scripts/analyze-complexity.py` 실행 시 포함됩니다.

### 가장 복잡한 함수 Top 10

| 순위 | 함수명 | 파일 | 복잡도 | 라인 수 | 최대 중첩 |
|------|--------|------|--------|---------|-----------|
| 1 | {{FUNC_NAME}} | {{FILE}}:{{LINE}} | {{COMPLEXITY}} | {{LINES}} | {{NESTING}} |
| 2 | ... | ... | ... | ... | ... |

**복잡도 기준**:
- 1-10: 단순 (유지보수 용이)
- 11-20: 보통 (주의 필요)
- 21-50: 복잡 (리팩토링 권장)
- 51+: 매우 복잡 (즉시 리팩토링 필요)

---

## 다음 단계

### 즉시 수정 (High Priority)

1. **{{ISSUE_1_TITLE}}** (`{{FILE}}:{{LINE}}`)
   - 예상 소요 시간: {{ESTIMATED_TIME}}
   - 영향 범위: {{IMPACT}}

2. **{{ISSUE_2_TITLE}}** (`{{FILE}}:{{LINE}}`)
   - 예상 소요 시간: {{ESTIMATED_TIME}}
   - 영향 범위: {{IMPACT}}

### 다음 스프린트 포함 (Medium Priority)

- {{ISSUE_1}}
- {{ISSUE_2}}
- {{ISSUE_3}}

### 장기 개선 과제 (Low Priority)

- {{SUGGESTION_1}}
- {{SUGGESTION_2}}

---

## 권장 작업 순서

1. **순환 의존성 제거** (있는 경우)
   - 테스트 작성이 불가능한 구조를 우선 해결

2. **Guard Clauses 적용**
   - 빠르게 적용 가능하며 즉각적인 가독성 향상

3. **Extract Function**
   - 긴 함수를 작은 단위로 분리

4. **Separation of Concerns**
   - 레이어 분리를 통한 구조 개선

5. **High Cohesion / Low Coupling**
   - 장기적인 리팩토링 과제

---

## 테스트 작성 권장

다음 함수들은 현재 테스트가 없거나 불완전합니다:

- [ ] `{{FUNCTION_1}}` (`{{FILE}}:{{LINE}}`)
- [ ] `{{FUNCTION_2}}` (`{{FILE}}:{{LINE}}`)
- [ ] `{{FUNCTION_3}}` (`{{FILE}}:{{LINE}}`)

**테스트 작성 우선순위**:
1. 비즈니스 로직이 복잡한 함수
2. 버그가 자주 발생하는 함수
3. 외부 의존성이 많은 함수

---

## 리뷰 기준

이 리뷰는 다음 원칙을 기반으로 작성되었습니다:

### Tidy First 4가지 원칙
1. **Guard Clauses**: 조기 반환으로 중첩 제거
2. **Extract Function**: 긴 함수를 작은 함수로 분리
3. **High Cohesion**: 관련된 기능끼리 묶기
4. **Low Coupling**: 의존성 최소화

### Modern Software Engineering 5가지 원칙
1. **Modularity**: 독립적인 모듈로 구성
2. **Cohesion**: 관련된 기능끼리 응집
3. **Separation of Concerns**: 관심사의 분리
4. **Information Hiding**: 정보 은닉과 캡슐화
5. **Coupling**: 최소한의 의존성

---

## 추가 리소스

- **Tidy First 상세 가이드**: `references/tidy-first.md`
- **Modern SE 상세 가이드**: `references/modern-engineering.md`
- **복잡도 분석 스크립트**: `scripts/analyze-complexity.py`
- **언어별 가이드**: `references/language-guides/`
- **프레임워크별 가이드**: `references/framework-guides/`

---

## 피드백

이 리뷰에 대한 피드백이 있으시면 다음과 같이 요청하세요:

- "특정 이슈에 대해 더 자세히 설명해줘"
- "Before/After 코드 예시를 더 보여줘"
- "이 원칙을 다른 파일에도 적용해줘"
- "특정 원칙만 다시 검토해줘"

---

**리뷰 완료 일시**: {{COMPLETION_TIME}}
**총 소요 시간**: {{DURATION}}

---

> 이 리뷰는 Claude Code의 code-review skill에 의해 자동 생성되었습니다.
> 상세한 원칙 설명과 예시는 `references/` 디렉토리를 참조하세요.
