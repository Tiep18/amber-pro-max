---
quick_id: 260711-jwl
status: complete
completed: 2026-07-11
commit: b88c361
---

# Taxonomy alignment correction summary

- Replaced the editor Card abstraction with an explicit shell so inherited padding no longer creates a nested metadata inset.
- Kept metadata, form content, and footer on the same 20/24px horizontal rhythm with one 8px outer radius.
- Expanded the Vietnamese/English segmented control across the full editor content width.
- Moved the taxonomy browser, search, section filters, and new-item action to the right desktop column.
- Preserved the existing mobile drawer and all editing behavior.

Verification passed: TypeScript, focused ESLint, 407 unit tests, and Next.js production build.
