# Fix Vietnamese Localized Route Loop Summary

## Completed

- Confirmed `/vi/cua-hang` returned `307` repeatedly with `location: /vi/cua-hang`.
- Added explicit proxy rewrites for Vietnamese localized aliases such as `/vi/cua-hang`, `/vi/san-pham`, `/vi/bai-viet`, and auth/account aliases.

## Verification

- `curl -L http://127.0.0.1:3210/vi/cua-hang` returns `200` with `0` redirects.
- `curl -L http://127.0.0.1:3210/vi/san-pham/gau-ca-hai` returns `200` with `0` redirects.
- `curl -L http://127.0.0.1:3210/vi/bai-viet` returns `200` with `0` redirects.
- `npm run typecheck`
- `npm run lint -- src/proxy.ts "src/app/[locale]/cua-hang/page.tsx" "src/app/[locale]/san-pham/[productSlug]/page.tsx" "src/app/[locale]/bai-viet/page.tsx" "src/app/[locale]/bai-viet/[postSlug]/page.tsx"`
