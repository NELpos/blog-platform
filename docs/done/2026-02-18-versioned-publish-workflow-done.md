# Versioned Publish Workflow Done Report

## Scope
- Replace pending-update based publish flow with version-selected publish workflow.
- Simplify Studio action model to state transitions:
  - Draft save
  - Publish selected version
  - Unpublish
  - Delete (only when unpublished)

## Harness Execution Summary
- Orchestration Agent: accepted user-approved model (draft persistence + selectable publish version).
- Beta User Agent: flagged action overload and unclear publish semantics in View mode.
- UX Engineer Agent: reduced CTA set and moved publish choice into explicit version list.
- Next.js Dev Lead/Engineer: delivered DB/API/UI slices with backward-compatible fallbacks.

## Completed Slices
1. Data model
- Added migration `supabase/migrations/20260218_post_version_workflow.sql`.
- Added `post_versions` table and posts live/published-version fields.

2. API workflow
- Reworked `src/app/api/posts/[id]/route.ts`:
  - `PUT`: save draft + create new version snapshot.
  - `PATCH publish_version`: publish chosen version by id.
  - `PATCH unpublish`: stop public exposure.
  - `GET`: return draft, live content, published version pointer, versions list.
- Updated `src/app/api/posts/route.ts` to seed initial version on post create.

3. Studio UX simplification
- Updated `src/components/blog/PostStudio.tsx`:
  - Edit mode: single Save path for draft.
  - View mode: fewer buttons + version history with `vN` and relative saved time.
  - Publish now happens via selecting a version row.
  - Public preview renders live content, not draft.

4. Public rendering alignment
- Updated public routes to render live published fields with fallback support:
  - `src/app/blog/[workspace_slug]/[post_slug]/page.tsx`
  - `src/app/blog/[workspace_slug]/page.tsx`

5. Dashboard/Studio loading compatibility
- Updated pages to read `published_version_id` with fallback when migration is not yet present:
  - `src/app/studio/page.tsx`
  - `src/app/dashboard/page.tsx`
- Removed pending-update badge dependency in `src/components/blog/DashboardPostIndex.tsx`.

## Verification Evidence
- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with existing warnings only (non-blocking):
  - unused var in skill script
  - `<img>` optimization warnings in markdown rendering/editor

## Unresolved Risks
- Production DB must run the new migration before full version workflow is available.
- Legacy environments without `post_versions` will run in fallback mode for some endpoints.

## Next Actions
1. Apply migration in all environments.
2. Add small E2E/manual checklist for:
   - save draft creates version
   - publish specific version
   - publish replacement auto-switches live version
   - unpublish hides public post
