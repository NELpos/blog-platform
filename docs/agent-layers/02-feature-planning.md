# Layer 02: Feature Planning

## Intake Protocol
1. Capture user request in Korean as-is.
2. Generate English execution prompt for downstream agents.
3. Ask user to choose skill(s) from relevant options.
4. Confirm ambiguity points before writing the final plan.
5. Output plan in Korean.

## Plan-to-Implement Transition
- Default behavior after plan approval: implement immediately.
- Plan-only sessions are allowed only when explicitly requested by the user.
- Plan must include implementation trigger and stop condition.

## Plan Format Source of Truth
- Use `docs/harness/templates/plan.template.md` as the canonical plan format.
- Do not duplicate or fork plan header fields in other docs.

## Research Rule
If external/current information is needed, delegate web research to a dedicated sub-agent and return only distilled results.
