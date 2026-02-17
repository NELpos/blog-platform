# 05-cleanup

## Objective
Remove tiptap runtime and dead code.

## Inputs
- `package.json`
- `src/components/editor/RichTextEditor.tsx`
- `src/lib/editor/content.ts`
- `src/lib/editor/lowlight.ts`
- `src/lib/editor/extensions/resizable-image.ts`

## Deliverables
- deleted obsolete files
- dependency cleanup in package manifest
- CSS cleanup for non-prosemirror styles

## Done Criteria
- no `@tiptap/*` imports remain
