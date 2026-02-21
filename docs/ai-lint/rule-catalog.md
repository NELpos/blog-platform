# AI-Lint Rule Catalog

## Purpose
Provide stable categories for lint findings and remediation ownership.

## Categories

### `ARCH`
- Scope: architecture boundaries, module coupling, unsafe layering shortcuts
- Severity: high/medium
- Autofix: usually no
- Remediation owner: feature implementer + reviewer

### `SEC`
- Scope: security-sensitive patterns, unsafe APIs, auth/permission risk indicators
- Severity: high
- Autofix: no
- Remediation owner: backend/security reviewer

### `DATA`
- Scope: API contract mismatches, schema usage anti-patterns, unsafe data handling
- Severity: high/medium
- Autofix: no
- Remediation owner: backend/db owner

### `UI`
- Scope: accessibility, render hygiene, React/Next client-server usage issues
- Severity: medium
- Autofix: partial
- Remediation owner: frontend owner

### `TEST`
- Scope: test reliability and assertions quality where lint rules apply
- Severity: medium/low
- Autofix: partial
- Remediation owner: implementer

## Rule Onboarding Policy
1. Add only a small number of new strict rules per cycle.
2. Validate impact in one pilot feature before broad rollout.
3. If a rule creates noisy false positives, downgrade or defer instead of adding suppressions.
