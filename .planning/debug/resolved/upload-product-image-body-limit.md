---
status: resolved
trigger: "Upload anh san pham fails with Runtime Error: Body exceeded 1 MB limit at ProductMediaPage -> MediaManager. Next.js 16.2.9 Turbopack."
created: 2026-06-27
updated: 2026-06-27
---

# Debug Session: upload-product-image-body-limit

## Symptoms

- expected_behavior: "Admin can upload product images up to the application-level product image limit."
- actual_behavior: "Uploading a product image larger than 1 MB fails before the media action can validate or upload the file."
- error_messages: "Body exceeded 1 MB limit. To configure the body size limit for Server Actions, see Next.js serverActions bodySizeLimit docs."
- timeline: "Reported on 2026-06-27."
- reproduction: "Open product media admin page and submit the Product image file form with an image over 1 MB."

## Current Focus

- hypothesis: "Resolved: media uploads use Server Actions with file FormData, but `next.config.ts` left the Server Action body size at the Next.js default 1 MB."
- test: "Typecheck and build verify Next accepts the configured Server Action body size limit."
- expecting: "Product image uploads up to 10 MB and pattern PDFs up to 50 MB can reach application validation instead of failing at Next's default 1 MB parser."
- next_action: "none"
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-06-27
  observation: "`src/components/admin/catalog/media-manager.tsx` submits image and PDF files through Server Actions."
- timestamp: 2026-06-27
  observation: "`src/catalog/media-schemas.ts` allows product images up to 10 MiB and pattern PDFs up to 50 MiB."
- timestamp: 2026-06-27
  observation: "`next.config.ts` previously had an empty config, leaving the Server Action body limit at Next.js default 1 MB."
- timestamp: 2026-06-27
  observation: "Configured `experimental.serverActions.bodySizeLimit` to `55mb`, matching the installed Next.js 16.2.9 `NextConfig` type."
- timestamp: 2026-06-27
  observation: "`npm run typecheck`, `npm run lint`, and `npm run build` completed successfully."

## Eliminated

- hypothesis: "The error originates from Supabase Storage upload limits."
  reason: "The failure occurs before `uploadProductImageAction` can run its storage upload code; the Next.js error says the Server Action request body exceeded the parser limit."
- hypothesis: "The admin media page is missing a route or render dependency."
  reason: "The stack points at `MediaManager` during Server Action submission, and the page builds successfully after configuration."

## Resolution

- root_cause: "File uploads were sent through Server Actions while Next.js kept the default 1 MB Server Action body limit."
- fix: "Set `experimental.serverActions.bodySizeLimit` to `55mb` in `next.config.ts` so configured media limits are enforceable by app validation."
- verification: "`npm run typecheck`; `npm run lint`; `npm run build`."
- files_changed: "next.config.ts"
