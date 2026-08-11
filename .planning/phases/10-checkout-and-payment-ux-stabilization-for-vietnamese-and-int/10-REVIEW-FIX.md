---
phase: 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
fixed_at: 2026-08-11T09:34:19.6444034Z
review_path: .planning/phases/10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int/10-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-08-11T09:34:19.6444034Z

**Source review:** `.planning/phases/10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int/10-REVIEW.md`

**Iteration:** 2

## Summary

- Findings in scope this iteration: 4
- Fixed this iteration: 4
- Skipped this iteration: 0
- Cumulative review-fix history: 9 findings fixed, 0 skipped across iterations 1 and 2
- No package, lockfile, migration, schema, generated database type, or RLS change was introduced

## Fixed Issues

### CR-01: Draft scope là hash công khai có thể đối chiếu ngược với danh tính ứng viên

**Status:** fixed: requires human verification

**Files modified:** `src/app/[locale]/checkout/page.tsx`, `src/checkout/editable-draft-scope.server.ts`, `src/checkout/editable-draft.ts`, `src/lib/env/server.ts`, `tests/unit/checkout/editable-draft.test.ts`, `tests/security/checkout-boundaries.test.mjs`

**Commits:** `ba5d3d1b`, `e66d9376`

**Applied fix:** Chuyển account-scope builder sang module `server-only`, dùng HMAC-SHA-256 với khóa đặc quyền hiện hữu được đọc tập trung từ `SUPABASE_SECRET_KEY`, và domain separation phiên bản `checkout-editable-draft:account-scope:v2:`. Client chỉ nhận digest 64 ký tự; raw identity và raw key không đi qua client/shared module hoặc log. Guest scope dùng domain v2 riêng, cố định và không chứa PII. Storage key/schema tăng lên v2; thao tác đọc, ghi và xóa đều loại record v1 công khai.

### WR-01: Auth notifier xóa draft hợp lệ trước khi biết scope có đổi hoặc sign-out thành công

**Status:** fixed: requires human verification

**Files modified:** `src/components/storefront-context.tsx`, `tests/unit/components/storefront-context-notifier.test.ts`, `tests/security/checkout-boundaries.test.mjs`

**Commit:** `8bfca299`

**Applied fix:** Bỏ thao tác xóa draft vô điều kiện khỏi notifier storefront chung. Notifier chỉ phát tín hiệu thay đổi/invalidation; checkout giữ draft khi auth thất bại hoặc identity vẫn cùng scope, còn `readEditableDraft` tự loại record bằng `scope_mismatch` sau khi scope xác thực thực sự đổi.

### WR-02: Test deadline VietQR không chạy route nên chưa chứng minh upstream không được gọi

**Status:** fixed

**Files modified:** `tests/unit/payments/vietqr-download-route.test.ts`

**Commit:** `fb9b7f64`

**Applied fix:** Thêm runtime route tests với fake clock và mock đúng các biên auth/query/upstream. Các nhánh unauthorized, deadline thiếu, sai, hết hạn và đúng biên đều trả generic 404; URL builder và `fetch` không được gọi. Deadline tương lai là control duy nhất được phép gọi upstream. Route production không cần refactor.

### WR-03: Copy rejected luôn yêu cầu liên hệ support dù có thể không có kênh support

**Status:** fixed

**Files modified:** `src/messages/en.json`, `src/messages/vi.json`, `tests/unit/i18n/phase-10-message-parity.test.ts`

**Commit:** `c2089d37`

**Applied fix:** Thay body rejected bằng hướng dẫn recovery độc lập với support ở cả tiếng Anh và tiếng Việt: giải thích kết quả, yêu cầu khôi phục sản phẩm vào giỏ và đặt đơn mới. Test cấm giả định `contact support`/`liên hệ hỗ trợ`; cấu hình zero-channel và configured-channel đều có hành động hợp lệ.

## TDD Evidence

- **CR-01 RED:** unit test thất bại vì server HMAC module chưa tồn tại và storage/schema vẫn v1; security test thất bại vì account scope còn được dựng bằng SHA-256 công khai. **GREEN:** 12/12 draft unit, checkout/secret security 20/20, typecheck và diff check.
- **WR-01 RED:** cả hai notifier tests thất bại vì draft bị xóa ngay khi notifier chạy; source boundary cũng phát hiện `clearBrowserEditableDraft`. **GREEN:** 14/14 focused unit và 19/19 checkout security, typecheck và diff check.
- **WR-02 mutation RED:** sau khi tạm vô hiệu deadline guard, bốn case missing/invalid/expired/exact-boundary đều trả 200 thay vì 404. Mutation được khôi phục trước commit. **GREEN:** 34/34 VietQR unit và 20/20 payment security, typecheck; route production không còn diff.
- **WR-03 RED:** message parity test nhận copy luôn giả định support. **GREEN:** 20/20 message/support unit, JSON parse, Vietnamese diacritics và typecheck.

## Verification

- Focused aggregate: 68/68 unit tests và 39/39 checkout/payment security tests passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run check:vi-diacritics`: passed; UTF-8 tiếng Việt được xác nhận bằng source search và JSON parse.
- `npm run test:security`: 77/77 passed, gồm secret scanner sau khi giữ tên privileged key trong module env tập trung.
- Full CI prefix trên local Supabase: lint, typecheck, diacritics, 987/987 unit tests, DB reset/lint, 942 pgTAP assertions và generated-type diff passed.
- Lần `npm run ci` duy nhất dừng ở build vì worktree ban đầu dùng junction `node_modules` trỏ ra ngoài filesystem root của Turbopack. Junction được thay bằng dependency install cục bộ không đổi package/lock; không chạy lại full CI.
- CI suffix trên cùng HEAD và local Supabase: production build passed, 77/77 security passed, DB reset passed.
- Full Playwright trên `http://localhost:3210` ghi nhận đúng một failure do worktree chưa nạp VietQR provider config; `.last-run.json` chỉ có một failed test ID. Sau khi nạp `.env.local` kín, vẫn override Supabase bằng local CLI values và giữ port 3210, focused rerun của test VietQR thất bại trước đó passed 1/1.
- Phase 09 Vercel geo/external SEO UAT vẫn deferred và không bị thay đổi.

## Cumulative Iteration Evidence

- Iteration 1: 5 findings fixed, 0 skipped (`fdf88d1c`, `f3ea4c6e`, `3a4bf880`, `9d003ed9`, `a2dfc0e0`).
- Iteration 2: 4 findings fixed, 0 skipped (`ba5d3d1b`, `e66d9376`, `8bfca299`, `fb9b7f64`, `c2089d37`).
- Cumulative: 9 findings fixed, 0 skipped.

---

_Fixed: 2026-08-11T09:34:19.6444034Z_

_Fixer: the agent (gsd-code-fixer)_

_Iteration: 2_
