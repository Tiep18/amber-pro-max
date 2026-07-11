# Quick Task Summary

## Delivered

- Added project-owned shadcn-style Popover, Calendar, and DateTimePicker components.
- Added pinned `react-day-picker` and `date-fns` dependencies.
- Replaced Admin Blog's native publish datetime control with the shared picker.
- Replaced Admin Orders' VietQR received-at control with the shared picker.
- Preserved Blog's local `YYYY-MM-DDTHH:mm` state contract.
- Serializes VietQR received time to the ISO timestamp required by its server schema.
- Keeps VietQR confirmation disabled until a received timestamp is selected.
- Provides calendar navigation, all 24 hours, all 60 minutes, and a clear action.
- Updated the skipped VietQR E2E contract to interact with the new picker.

## Verification

- Focused DateTimePicker tests passed (3 tests).
- `npm run typecheck`
- Focused ESLint and Prettier checks
- `npm run test:unit` (68 files, 416 tests)
- `npm run build`
