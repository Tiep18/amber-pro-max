---
status: resolved
trigger: "sao tôi thấy các ảnh ở trang chủ không đổi nhỉ"
created: 2026-07-31
updated: 2026-07-31
diagnose_only: true
---

# Debug Session: Home images still appear unchanged

## Symptoms

- Expected: the home page displays visibly new, warm-toned imagery.
- Actual: the user perceives the previous images on the home page.
- Errors: none reported.
- Timeline: observed immediately after replacing and committing the four assets.
- Reproduction: open or refresh the project home page.

## Evidence

- The active Next.js dev server is running from `C:\Users\HNBV12714\Documents\Test GSD` on port 3000.
- Direct HTTP responses for all four `/images/home/*.png` URLs have SHA-256 hashes identical to the newly generated files on disk.
- The `_next/image` request for the hero returned `X-Nextjs-Cache: MISS` and visually contains the new warm palette.
- The generated assets intentionally preserve the exact original subjects, object positions, framing, and composition; only palette and white balance changed.
- No open Ambertinybear tab was available in the connected Chrome profile to identify whether the user was viewing local development or a deployed URL.

## Eliminated

- hypothesis: files were not overwritten
  evidence: disk hashes and modification times are new.
- hypothesis: the local static file handler serves old files
  evidence: HTTP hashes match disk hashes.
- hypothesis: Next/Image reuses an old optimized derivative
  evidence: optimizer returned a cache miss and rendered the new hero.
- hypothesis: the dev server runs from another workspace
  evidence: the active Next.js process command line points to this workspace.

## Resolution

- root_cause: The previous implementation was a palette-only edit that preserved the old scenes so closely that the page still looks unchanged at normal viewing size. If the user is viewing a deployed URL, that deployment is also unchanged because no deployment was requested or performed.
- fix: No fix applied in diagnose-only mode. A visibly different result requires newly composed images (and deployment if the target is a hosted site), ideally with versioned filenames to make cache invalidation explicit.
- verification: Local source, static responses, and Next/Image output all contain the new warm files.
- files_changed: none outside this debug record.
