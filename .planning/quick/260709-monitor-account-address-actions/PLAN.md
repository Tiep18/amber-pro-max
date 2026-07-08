---
status: complete
created: 2026-07-09
slug: monitor-account-address-actions
---

# Quick Task: Monitor Account Address Actions

Migrate customer saved-address load and mutation helpers to the global monitored action pattern so operational recorder failures never change account UI error states.

## Verification

- Add failing regression coverage proving address action/query error states survive recorder failure.
- `npm run test:unit -- tests/unit/account/addresses.test.ts tests/unit/operations/monitoring.test.ts`
- `npm run typecheck`
- `npm run lint`
