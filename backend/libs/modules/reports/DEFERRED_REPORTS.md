# Deferred Reports — Extension Hooks

These Mangomint-parity reports are registered in [`report.definitions.ts`](./registry/report.definitions.ts) with `deferred: true`. They appear in documentation only and are rejected by `ReportQueryService.assertReportAllowed` until a provider is registered and `deferred` is cleared.

## Cash Drawer Activity (`cash_drawer_activity`)

**Blocker:** No `CashDrawer` / drawer session / pay-in-pay-out domain models.

**When the Cash Drawer module ships:**

1. Add Prisma models for drawer sessions, pay-ins, pay-outs, and adjustments (scoped by `businessId`).
2. Create `providers/cash-drawer-activity.provider.ts` implementing `ReportDataProvider` with `key: 'cash_drawer_activity'`.
3. Set `deferred: false` (or remove `deferred`) on the definition in `report.definitions.ts`.
4. Add the provider class to `ALL_REPORT_PROVIDERS` in `providers/index.ts`.
5. Gate with `requiredModuleKey: 'cash_drawer'` (add capability module) — catalog + generate/export re-check already honor this.

## Days Off By Staff (`days_off`)

**Blocker:** No first-class PTO / staff leave entity. Closest data is `CalendarException.isUnavailable`.

**When Days Off ships (or v2 approximation):**

1. Prefer a `StaffDayOff` (or equivalent) model with staff, dates, and reason.
2. Or implement v2 using `CalendarException` where `isUnavailable` is true for staff calendars.
3. Create `providers/days-off.provider.ts` with `key: 'days_off'`.
4. Clear `deferred` on the definition and register the provider.

## Payroll (`payroll`)

**Blocker:** No commission, tips, hourly compensation, or pay-adjustment models. Mangomint keeps Payroll in a separate app ([Payroll Report](https://www.mangomint.com/learn/payroll-report/)).

**When Payroll / compensation ships:**

1. Add compensation rules, tips, and pay adjustments.
2. Create `providers/payroll.provider.ts` with `key: 'payroll'` (optionally journal / cash-requirements as sibling keys).
3. Clear `deferred`, register provider, and add `requiredModuleKey: 'payroll'` capability gating.

## Pattern reminder

Adding any future report never requires a new PDF/Excel engine:

1. Add/update entry in `REPORT_DEFINITIONS`.
2. Implement one `ReportDataProvider` that returns a `ReportDocument`.
3. Register it in `ALL_REPORT_PROVIDERS`.
4. Reusable PDFKit + exceljs renderers consume the document as-is.
