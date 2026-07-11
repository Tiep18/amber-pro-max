# Quick Task Plan

## Goal

Reproduce the still-failing Blog draft save against the configured remote Supabase project, identify the exact rejected payload path, fix the root cause, and verify creation end to end.

## Tasks

- [x] Create and clean up a temporary remote admin identity using the server-side Supabase client.
- [x] Reproduce draft creation through the real local UI and capture the returned validation path.
- [x] Add a failing regression test for the confirmed root cause.
- [x] Implement the smallest fix while preserving server validation authority.
- [x] Re-run the browser flow, verify the remote draft row, clean up test data, and run repository checks.

## Guardrails

- Never expose `.env.local` secrets or ship temporary debug credentials.
- Use the service client only in a Node server process.
- Do not modify or stage the existing user change in `src/app/admin/layout.tsx`.
