# Layer 04: Backend Flow

## Required Review Before Coding
- API filesystem structure under `src/app/api/*`
- Session/auth path (`src/lib/supabase/*`, auth callback, middleware)
- Authorization boundaries and expected role behavior

## Implementation Checklist
- Keep endpoint contracts explicit (request/response/error)
- Verify auth/session guards for each route
- Add/update tests for success, permission failure, and validation failure
