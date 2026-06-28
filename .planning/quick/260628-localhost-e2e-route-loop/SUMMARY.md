# Localhost E2E Route Loop Summary

## Findings

- The proxy and `next-intl` pathnames were not the root problem.
- Main/root served `/vi/cua-hang` correctly with `x-middleware-rewrite: /vi/catalog`.
- The worktree loop happened when the dev server was started with `--hostname 127.0.0.1` while the browser/site URL used `localhost` semantics.
- In that mode, `next-intl` emitted an absolute rewrite header and Next returned a `307` back to the localized URL.

## Completed

- Reverted the route alias workaround commit.
- Set `turbopack.root` so worktree dev runs do not infer the parent repo root.
- Changed Playwright to use `http://localhost:3210` and `npm run dev -- --port 3210`.

## Verification

- `curl -I http://localhost:3210/vi/cua-hang` returns `200` when the worktree dev server is started without `--hostname 127.0.0.1`.
- `npm run test:e2e -- tests/e2e/launch-seo.spec.ts` passes with `.env.local` and `NEXT_PUBLIC_SITE_URL=http://localhost:3210`.
- `npm run lint`
- `npm run typecheck`
- `npm run build`
