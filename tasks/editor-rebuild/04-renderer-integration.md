# 04-renderer-integration

## Objective
Render markdown and shortcodes consistently in studio preview and public pages.

## Inputs
- `src/components/blog/MarkdownRenderer.tsx`
- `src/components/blog/PostViewer.tsx`
- `src/components/blog/PostStudio.tsx`
- `src/app/blog/[workspace_slug]/page.tsx`
- `src/app/blog/[workspace_slug]/[post_slug]/page.tsx`

## Deliverables
- markdown renderer component
- shortcode rendering for image/video
- integration in dashboard/admin/public paths

## Done Criteria
- edit/view/public all use same rendering behavior
