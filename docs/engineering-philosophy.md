# Engineering Philosophy

## Decision Principles
1. Evidence-based decision making
2. Security and authorization first
3. Documentation reusability and leverage

## Development Style
- Balanced speed and quality (not speed-only, not perfection-only)
- Spec-driven development with research before implementation
- Explicit plan and acceptance criteria before coding

## Mandatory Review Windows
- Feature design review: at least 15 minutes
- Pre-implementation critical review: at least 10 minutes

## PRD Requirements
Required sections:
- problem definition
- user scenarios
- code quality evaluation plan
- critical-time review notes
- BM review

BM rule:
- BM review is required at PRD stage by default
- BM-nonrelated features may be marked `N/A` with a short rationale

## Failure Patterns to Guard
- spec omissions
- context misunderstandings
- missing tests

## Automation Boundary
- lint/format automation: allowed
- architecture-changing decisions: manual approval required (owner: founder)

## Source Reliability Priority
1. official documentation
2. original author posts
3. engineering blogs from strong teams
4. community posts with weighted credibility checks

Community source weighting criteria:
- stars/forks
- recency of commits
- issue response quality
- author credibility

## AI Content Policy
- AI-generated content must be labeled at post level (web-visible)
- private code/keys handling, license compliance, and provenance checks are mandatory
