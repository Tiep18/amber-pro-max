---
quick_id: 260712-0ix
status: complete
completed: 2026-07-12
---

# Summary

Operations incidents now use a compact desktop scan row that combines area, severity, and occurrence metadata beneath the error code, keeps only the latest timestamp visible, and groups actions at the row edge. Sanitized facts moved into a responsive 680px Sheet containing the full incident identity, timeline, status, occurrence count, and untruncated formatted facts.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit` (69 files, 418 tests)
- `npm run build`
- Targeted Playwright spec updated; execution was blocked by an existing Next.js development-server workspace lock.

