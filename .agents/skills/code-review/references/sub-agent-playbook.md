# Code Review Sub-agent Playbook

## 목차
- 목적
- 위임 결정 기준
- 권장 역할 분리
- 호출 패킷 표준
- 결과 통합 규칙
- 운영상 주의사항

## 목적

코드 리뷰 작업을 역할별 sub-agent로 분할해 품질과 속도를 동시에 높인다.

## 위임 결정 기준

아래 조건 중 하나라도 만족하면 sub-agent 위임을 기본으로 사용한다.

- 변경 파일 수가 많다(예: 8개 이상).
- 다중 스택(TypeScript + Python, React + Next.js 등)이 섞였다.
- 보안/성능/아키텍처 관점 검토가 동시에 필요하다.
- 긴 탐색(로그, 대규모 diff, 다수 테스트 결과)로 메인 컨텍스트 소비가 크다.

## 권장 역할 분리

- `code-reviewer`: 일반 코드 품질, 리팩토링 후보, 가독성
- `security-reviewer`: 인증/인가, 입력 검증, 비밀정보 노출, unsafe API 사용
- `performance-reviewer`: 알고리즘 복잡도, 렌더링/쿼리/IO 병목
- `framework-reviewer`: 프레임워크별 anti-pattern과 운영 관례

작업 배분 원칙:
- 동일 파일을 여러 역할이 보더라도 관점이 다르면 병렬 호출한다.
- 한 역할이 과도하게 넓은 범위를 가지면 파일 단위로 다시 분할한다.

## 호출 패킷 표준

sub-agent 호출 시 아래 항목을 반드시 포함한다.

- 목표: "무엇을 왜 검토하는지" 한 문장
- 범위: 파일 경로, 디렉터리, diff, PR 번호
- 기준: 적용할 원칙/가이드 경로
- 제약: read-only 여부, 금지 도구, 실행 시간
- 출력 형식: 구조화된 이슈 목록

권장 출력 필드:

```text
priority: High|Medium|Low
file: path/to/file
line: 1-based line number
principle: Tidy First | Modern SE | Language/Framework rule
problem: what is wrong
fix: concrete change
evidence: command/output/code snippet
```

## 결과 통합 규칙

1. 중복 이슈는 병합하고, 근거가 더 강한 항목을 남긴다.
2. 상충 제안은 리스크가 낮고 롤백이 쉬운 방안을 우선한다.
3. 최종 보고서는 `assets/review-template.md`에 맞춰 재배열한다.
4. unresolved 항목은 "추가 확인 필요"로 분리한다.

## 운영상 주의사항

- sub-agent는 부모의 스킬을 자동 상속하지 않을 수 있으므로 필요한 기준을 호출 패킷에 명시한다.
- background sub-agent에서는 일부 도구(MCP 등)가 제한될 수 있다.
- clarifying question이 필요한 작업은 foreground sub-agent 또는 메인 에이전트에서 처리한다.

## BP 근거 출처

- Claude Code Docs - Subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Claude Blog - Skills Explained: https://www.anthropic.com/engineering/skills
- Claude Blog - Equipping Agents for the Real World with Skills: https://www.anthropic.com/news/agent-skills
- Agent Skills Best Practices: https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices
