---
name: code-review
description: |
  Tidy First 4가지 원칙(Guard Clauses, Extract Function, High Cohesion, Low Coupling)과
  Modern Software Engineering 5가지 원칙(Modularity, Cohesion, Separation of Concerns,
  Information Hiding, Coupling)을 기반으로 체계적인 코드 품질 분석과 개선 제안을 제공합니다.

  다음과 같은 요청에 자동으로 트리거됩니다:
  - "코드 리뷰해줘", "review this code", "code review please"
  - "리팩토링 제안해줘", "suggest refactoring", "improve this code"
  - "코드 품질 확인해줘", "check code quality"
  - "PR 리뷰해줘", "review PR", "review pull request"
  - "/review", "/code-review"
license: MIT
metadata:
  author: nelpos
  version: "1.0.0"
---

# Code Review Skill

## 개요

이 Skill은 코드를 **Tidy First**와 **Modern Software Engineering** 원칙에 따라 체계적으로 검토하고, 우선순위가 지정된 개선 제안을 제공합니다.

**핵심 원칙**:
- ✅ Tidy First 4가지: Guard Clauses, Extract Function, High Cohesion, Low Coupling
- ✅ Modern SE 5가지: Modularity, Cohesion, Separation of Concerns, Information Hiding, Coupling
- ✅ 언어/프레임워크 독립적 (확장 가능한 구조)

## Quick Start Workflow

### 1. 리뷰 범위 파악

사용자가 제공한 파일, 디렉토리, 또는 git diff를 확인하고 프로젝트 특성을 파악합니다.

```
- 파일 경로가 주어진 경우: 해당 파일 직접 읽기
- 디렉토리가 주어진 경우: Glob으로 소스 파일 수집
- PR 번호가 주어진 경우: gh pr diff 실행
- 프로젝트 전체 분석: package.json, requirements.txt 등으로 언어 감지
```

**언어/프레임워크 자동 감지**:
- `package.json` → TypeScript/JavaScript
- `requirements.txt`, `setup.py` → Python
- `pom.xml`, `build.gradle` → Java
- `Cargo.toml` → Rust
- `go.mod` → Go

### 2. 기본 리뷰 프로세스 (3단계)

#### Phase 1: Tidy First 원칙 검토 (빠른 개선)

다음 항목을 **순서대로** 검토합니다:

**1. Guard Clauses (조기 반환)**
- 중첩된 if문이 3단계 이상인가?
- else 블록이 불필요하게 길게 이어지는가?
- 예외 조건을 함수 초반에 처리할 수 있는가?

**2. Extract Function (함수 추출)**
- 함수가 30줄 이상인가?
- 함수 내에 명확히 구분되는 섹션(주석으로 분리)이 있는가?
- 중간에 빈 줄이 여러 개 있는가?
- 함수명만으로 내부 로직을 유추하기 어려운가?

**3. High Cohesion (높은 응집도)**
- 클래스/모듈에 관련 없는 기능이 섞여 있는가?
- "UserManager"가 이메일 발송, 결제 처리까지 하는가?
- 함수가 여러 데이터 소스를 동시에 조작하는가?

**4. Low Coupling (낮은 결합도)**
- 구체 클래스에 직접 의존하는가?
- 생성자에서 직접 인스턴스를 생성하는가?
- 테스트 시 실제 데이터베이스가 필요한가?

> **상세 체크리스트**: `references/tidy-first.md` 참조

#### Phase 2: Modern SE 원칙 검토 (구조적 개선)

다음 항목을 검토합니다:

**1. Modularity (모듈성)**
- 이 컴포넌트를 독립적으로 테스트할 수 있는가?
- 다른 프로젝트로 이동 가능한가?
- 명확한 입출력 인터페이스가 있는가?

**2. Cohesion (응집성)**
- 클래스의 모든 메서드가 같은 데이터를 사용하는가?
- 메서드 간에 공유하는 필드가 있는가?
- 클래스명이 "Manager", "Util", "Helper"인가? (낮은 응집도 신호)

**3. Separation of Concerns (관심사 분리)**
- UI 코드에 비즈니스 로직이 섞여 있는가?
- 데이터베이스 쿼리와 비즈니스 로직이 같은 함수에 있는가?
- 로깅, 에러 처리, 메인 로직이 뒤섞여 있는가?

**4. Information Hiding (정보 은닉)**
- 클래스 필드가 public으로 노출되어 있는가?
- 내부 구현 세부사항이 외부에 드러나는가?
- Getter/Setter가 모든 필드에 있는가?

**5. Coupling (결합도)**
- 이 클래스가 다른 클래스를 직접 생성하는가?
- 의존성 개수가 5개 이상인가?
- 의존성이 양방향인가? (순환 의존)
- 변경 시 연쇄적으로 여러 파일을 수정해야 하는가?

> **상세 체크리스트**: `references/modern-engineering.md` 참조

#### Phase 3: 언어/프레임워크 특화 검토 (선택)

프로젝트 특성에 따라 해당 가이드를 로드합니다:

- **TypeScript**: `references/language-guides/typescript.md`
- **JavaScript**: `references/language-guides/javascript.md`
- **React**: `references/framework-guides/react.md`
- **Next.js**: `references/framework-guides/nextjs.md`

### 3. 우선순위 부여 시스템

모든 발견 사항을 다음 기준으로 분류합니다:

#### High Priority (즉시 수정 권장)
- 버그 가능성이 있는 패턴
- 보안 취약점 (SQL 인젝션, XSS 등)
- 심각한 성능 이슈
- 테스트 불가능한 구조 (강한 결합도)
- 순환 의존성

#### Medium Priority (다음 리팩토링에 포함)
- 가독성 저하 (중첩 조건문, 긴 함수)
- 중복 코드 (DRY 위반)
- 불필요한 결합도
- 낮은 응집도 (여러 책임이 섞임)

#### Low Priority (시간 여유 시)
- 네이밍 개선
- 주석 추가
- 사소한 최적화
- 코드 스타일 통일

### 4. 리뷰 리포트 생성

`assets/review-template.md`를 사용하여 다음 형식으로 출력합니다:

```markdown
# 코드 리뷰 결과

## 요약
- 검토 파일: X개
- 발견 사항: High Y개, Medium Z개, Low W개
- 전체 품질 점수: Tidy First 준수율 A%, Modern SE 준수율 B%

## High Priority Issues

### 1. [파일명:줄번호] Guard Clauses 미적용

**분류**: Tidy First - Guard Clauses

**문제점**:
3단계 중첩 if문으로 가독성이 저하되어 있습니다.

**개선 제안**:

**Before**:
```typescript
function processUser(user: User | null) {
  if (user) {
    if (user.age >= 18) {
      if (user.isActive) {
        return { success: true, message: `이메일 전송: ${user.email}` }
      }
    }
  }
}
```

**After**:
```typescript
function processUser(user: User | null) {
  if (!user) return { success: false, message: '사용자 없음' }
  if (user.age < 18) return { success: false, message: '미성년자' }
  if (!user.isActive) return { success: false, message: '비활성 사용자' }

  return { success: true, message: `이메일 전송: ${user.email}` }
}
```

**개선 효과**:
- 코드 평탄화로 인지 부하 감소
- 주요 로직이 마지막에 명확히 표현됨
- 예외 조건과 정상 흐름의 분리
```

## 사용 예시 (한국어 프롬프트)

### 예시 1: 단일 파일 리뷰

**사용자**: "lib/utils.ts 코드 좀 봐줘"

**Claude 실행 순서**:
1. Skill 자동 트리거 ("코드 봐줘" 키워드 매칭)
2. `Read lib/utils.ts`
3. 언어 감지 (TypeScript)
4. `references/tidy-first.md` 로드
5. 4가지 원칙 순서대로 검토
6. 발견 사항 우선순위 부여
7. 한글 리포트 생성

### 예시 2: 함수가 너무 길 때

**사용자**: "이 함수 너무 긴데 어떻게 개선할까?"

**Claude 실행 순서**:
1. Skill 자동 트리거 ("개선할까?" 키워드)
2. 현재 대화 컨텍스트에서 함수 코드 추출
3. Extract Function 원칙 적용
4. 주석으로 구분된 블록 탐지
5. 분리 가능한 함수 제안
6. Before/After 코드 예시 제공

### 예시 3: PR 전체 리뷰

**사용자**: "PR #123 머지 전에 검토해줘"

**Claude 실행 순서**:
1. Skill 자동 트리거 ("검토해줘" 키워드)
2. `gh pr diff 123` 실행
3. 변경된 파일 목록 추출
4. 각 파일 리뷰 후 통합 리포트
5. 한글로 우선순위별 정리

### 예시 4: 프로젝트 전체 분석

**사용자**: "프로젝트 전체 코드 품질 어때?"

**Claude 실행 순서**:
1. Skill 자동 트리거 ("코드 품질" 키워드)
2. Glob으로 모든 소스 파일 스캔
3. 각 파일에 대해 빠른 스캔
4. Complexity >= 10 또는 Lines >= 30인 함수만 상세 리뷰
5. Top 10 이슈 리스트 (한글)
6. 전체 품질 점수 제공

## 제외 대상

다음은 리뷰 범위에서 자동으로 제외됩니다:

- **자동 생성 코드**: `*.generated.ts`, `migrations/`, `__generated__/`
- **의존성 파일**: `node_modules/`, `vendor/`, `venv/`
- **빌드 결과물**: `dist/`, `build/`, `out/`, `target/`
- **테스트 커버리지**: `coverage/`, `.nyc_output/`
- **설정 파일**: `*.config.js`, `*.config.ts` (단, 필요시 포함 가능)

## 리뷰 체크리스트 (빠른 참조)

### Tidy First 체크리스트

| 원칙 | 검토 항목 | 발견 시 우선순위 |
|------|-----------|------------------|
| **Guard Clauses** | 중첩 if문 3단계 이상? | Medium |
| **Extract Function** | 함수 30줄 이상? | Medium |
| **High Cohesion** | 관련 없는 기능 섞임? | Medium |
| **Low Coupling** | 구체 클래스 직접 의존? | High |

### Modern SE 체크리스트

| 원칙 | 검토 항목 | 발견 시 우선순위 |
|------|-----------|------------------|
| **Modularity** | 독립적 테스트 불가? | High |
| **Cohesion** | 클래스명이 "Manager"? | Medium |
| **Separation of Concerns** | UI에 비즈니스 로직 섞임? | High |
| **Information Hiding** | public 필드 노출? | Low |
| **Coupling** | 순환 의존성 존재? | High |

## 고급 사용법

### 1. 특정 원칙만 검토하기

**사용자**: "이 코드 결합도만 확인해줘"

**Claude**: Low Coupling 원칙만 적용하여 리뷰

### 2. Before/After 비교 요청

**사용자**: "이 코드 Guard Clauses 적용하면 어떻게 변해?"

**Claude**: 현재 코드와 개선된 코드를 나란히 비교

### 3. 복잡도 분석 요청

**사용자**: "이 프로젝트에서 가장 복잡한 함수 10개 찾아줘"

**Claude**: `scripts/analyze-complexity.ts` 실행 (TypeScript가 있는 경우)

### 4. 언어별 최적화 제안

**사용자**: "TypeScript 관점에서 이 코드 개선점 알려줘"

**Claude**: `references/language-guides/typescript.md` 로드 후 특화 리뷰

## 리포트 커스터마이징

### 간단한 리포트 (요약만)

**사용자**: "간단하게 요약만 해줘"

**출력**:
```
코드 리뷰 요약:
- High: 2개 (Low Coupling 1개, Modularity 1개)
- Medium: 5개 (Guard Clauses 3개, Extract Function 2개)
- Low: 1개 (네이밍)

즉시 수정 권장: UserService의 Database 직접 의존 → 인터페이스 도입 필요
```

### 상세한 리포트 (코드 예시 포함)

**사용자**: "자세하게 Before/After 코드까지 보여줘"

**출력**: `assets/review-template.md` 전체 형식 사용

## 주의사항

1. **SKILL.md는 워크플로우 가이드**
   - 상세 내용은 `references/` 참조
   - 토큰 비용 절감을 위해 간결하게 유지

2. **Progressive Disclosure 원칙**
   - 기본 리뷰는 Tidy First만 (빠름)
   - 필요시 Modern SE 원칙 로드
   - 언어/프레임워크 가이드는 감지 시에만 로드

3. **Before/After 예시 필수**
   - 모든 제안은 구체적인 코드 예시와 함께
   - 한글 설명으로 개선 효과 명시

4. **우선순위 기준 명확화**
   - High: 버그 가능성, 테스트 불가
   - Medium: 가독성, 유지보수성
   - Low: 스타일, 네이밍

## 확장 가이드

### 새 언어 추가하기

1. `references/language-guides/` 아래 파일 생성
2. 해당 언어의 특화 패턴 정의
3. SKILL.md는 수정 불필요 (자동 감지)

### 새 프레임워크 추가하기

1. `references/framework-guides/` 아래 파일 생성
2. 프레임워크별 안티패턴 정의
3. SKILL.md는 수정 불필요

## 참고 자료

- Tidy First 상세 가이드: `references/tidy-first.md`
- Modern SE 상세 가이드: `references/modern-engineering.md`
- 리포트 템플릿: `assets/review-template.md`
- 복잡도 분석 스크립트: `scripts/analyze-complexity.ts`

---

**이 Skill은 다른 프로젝트에 바로 적용할 수 있는 범용 코드 리뷰 도구입니다!**
