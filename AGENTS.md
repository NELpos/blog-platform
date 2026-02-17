# Repository Guidelines

## Project Structure & Module Organization
The app uses Next.js App Router with TypeScript.

- `src/app`: routes, layouts, API handlers (`src/app/api/*`), and page-level UI.
- `src/components`: reusable UI and feature components (`auth`, `blog`, `editor`, `ui`).
- `src/lib`: shared integrations/utilities (Supabase clients, editor upload helpers, design tokens).
- `src/types`: shared TypeScript types (including generated DB types).
- `public`: static assets.
- `supabase`: SQL schema, RLS policies, triggers, and storage setup.
- `docs`: setup guides (see `docs/SUPABASE_SETUP.md`).

Use the `@/*` alias for imports from `src` (configured in `tsconfig.json`).

## Build, Test, and Development Commands
- `pnpm dev`: start local dev server at `http://localhost:3000`.
- `pnpm lint`: run ESLint (Next.js core-web-vitals + TypeScript rules).
- `pnpm build`: create a production build and catch type/build issues.
- `pnpm start`: run the built app locally (after `pnpm build`).

Typical local verification before opening a PR:
`pnpm lint && pnpm build`

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` enabled).
- Components: `PascalCase` filenames (example: `PostList.tsx`).
- Routes: Next.js folder conventions with lowercase segments and dynamic params (example: `src/app/blog/[workspace_slug]/[post_slug]/page.tsx`).
- Shared helpers/utilities: lowercase files under `src/lib`.
- Follow existing style: single quotes, no semicolons, concise functions, and 2-space indentation.

## Testing Guidelines
There is currently no test runner configured. Until tests are added, use:
- `pnpm lint`
- `pnpm build`
- manual checks for key flows (login, dashboard, post create/edit/view)

When introducing tests, prefer colocated `*.test.ts` / `*.test.tsx` files near the feature or a mirrored `src/__tests__` tree.

## Commit & Pull Request Guidelines
Git history is minimal (`Initial commit from Create Next App`), so follow clear, imperative commit messages (example: `Add post slug validation in API route`).

For PRs:
- keep scope focused;
- describe behavior changes and affected routes/APIs;
- link issues/tasks;
- include screenshots for UI changes;
- note Supabase schema/RLS updates and any required `.env.local` changes.
