# Appointments — production readiness audit

**Product:** PandaCue (`ApexSpace/business-ops-product`)  
**Scope:** Appointments feature only (staff calendar, public/express booking, waitlist, related jobs). Audit-only — no application code in this PR.  
**Code base:** `development` @ `b8107d4c`  
**Date:** 2026-09-14  
**Auditor:** Cloud Agent  

---

## 1. Executive summary

**Verdict: Ready with fixes — do not promote Appointments to `main` until P0s are fixed or explicitly waived.**

Staff booking, public book-by-slug, tenant isolation, capability gating, and `confirm=true` deletes are in place and behaved correctly on this environment. Enums on the appointments FE surface match Prisma. C-P0-02 (staff keys used as capability keys) and CAP-02 (list-only plans granting express booking) are **already fixed on `development`**.

Two P0s still sit on the booking/status core:

1. **Slot uniqueness is optimistic.** Conflict checks then insert with no row lock, no exclusion constraint, and no serializable transaction. Two concurrent public (or staff) POSTs can both pass the check and create overlapping blocking appointments (`BOOK-06` / `J2-02` race).
2. **Status PATCH has no transition matrix.** Any `AppointmentStatus` is accepted after permission + a WAITING-room gate. Staff API can reopen `COMPLETED` / `CANCELLED` / `NO_SHOW` without a product rule.

Until those are closed (or waived in writing), Appointments should stay on `development`. P1s (resources never allocated, public create not transactional, Google import skipping conflicts, waitlist/NO_SHOW UI) should follow in small backend-first batches.

---

## 2. Feature map

### Backend (Nest under `backend/libs/modules/operations/`)

| Area | Module path | HTTP surface |
|------|-------------|--------------|
| Staff appointments | `appointments/` | `/appointments`, `/appointments/:id`, `/status`, `/notify`, `/photos`, `/activity`, `DELETE ?confirm=true` |
| Express (staff) | `express-booking/` | `POST /appointments/express`, `/:id/express/resend`, `/:id/express/staff-complete` |
| Express (public) | `express-booking/` | `/public/express/:token` (+ `/staff`, `/checkout`, `/complete`) |
| Public book | `public-booking/` | `/public/booking/businesses/:slug/*` (catalog, staff, availability, appointments, waitlist, checkout, uploads); deprecated `/calendars/:slug/*` |
| Client manage | `public-booking/` | `/public/appointments/:token` (+ `/cancel`, `/availability`, `/reschedule`) |
| Waitlist | `waitlist/` | `/waitlist`, `/summary`, `/:id/dismiss`, `/:id/book`, `/:id/cancel` |
| Calendars | `calendars/` | `/calendars` (+ staff, availability, exceptions); `/calendar-display-settings` |
| Scheduling | `scheduling-settings/` | `/scheduling-settings` |
| Online booking | `online-booking-settings/` | `/online-booking-settings` (+ hours, preferences, staff-selection, setup) |
| Waiting room | `appointments/waiting-room-settings/` | `/waiting-room-settings` |
| Cancel/reschedule | `appointments/cancel-reschedule-settings/` | `/cancel-reschedule-settings` |
| Automated messages | `appointments/automated-messages/` | `/appointment-automated-messages` |
| Quick tools | `online-booking-settings/quick-tools/` | `/quick-tools/set-not-working*`, `remove-not-working*` |

**Guards (staff):** `BusinessRolesGuard` + `BusinessCapabilityGuard`. Appointments: `@RequireModule('appointments')` + `@StaffPermission('appointments.access')`. Express: additional `@RequireCapability('appointments.express_booking')`. Waitlist: `@RequireCapability('appointments.waitlist')`. Calendars: `@RequireModule('calendar')`. Online booking settings: `@RequireModule('online_booking')`.

**Prisma:** `Appointment`, `AppointmentServiceLine`, `AppointmentResourceAssignment` (unused in TS), `Calendar*`, `BusinessSchedulingSettings`, `BusinessOnlineBookingSettings`, `BookingWaitlistEntry`, waiting-room / cancel-reschedule / automated-message settings.

**Enums:** `AppointmentStatus` = `PENDING_COMPLETION | UNCONFIRMED | CONFIRMED | WAITING | IN_SERVICE | COMPLETED | CANCELLED | NO_SHOW`. `AppointmentSource` = `INTERNAL | BOOKING_WIDGET | PUBLIC_LINK | EXPRESS | GOOGLE_SYNC | IMPORTED`.

### Frontend routes

| Path | Feature |
|------|---------|
| `/business/appointments` | Calendar / list / drawers / waitlist panel |
| `/business/settings/calendars/**` | Calendar CRUD, availability, exceptions |
| `/business/settings/scheduling-options` | Buffers / notice |
| `/business/settings/display-preferences` | Calendar chrome |
| `/business/settings/waiting-room` | Waiting-room settings |
| `/business/settings/appointment-booked` | Automated messages (`BOOKED` only) |
| `/business/settings/cancel-reschedule` | Self-cancel / reschedule / late cancel |
| `/business/settings/express-booking` | Express admin (online-booking-settings fields) |
| `/business/settings/quick-tools` | Not-working apply |
| `/business/settings/online-booking/**` | Public booking setup |
| `/book/[slug]`, `/booking/[slug]`, `/calendar/[slug]` → book, embeds | Public booking |
| `/manage/[token]` | Client cancel/reschedule |
| `/express/[token]` | Express completion |

Capability map (current): appointments list → `appointments.list`; express settings → `appointments.express_booking`; waiting-room / booked / cancel-reschedule / quick-tools → `appointments.list` (not staff `appointments.access`).

### Jobs / scheduler (`backend/libs/core/scheduler/scheduler-tasks.service.ts`)

| Job | Cadence | Action |
|-----|---------|--------|
| Appointment reminders | `EVERY_HOUR` | `AppointmentReminderService.processDueReminders` |
| Express expiry | `EVERY_MINUTE` | Cancel `PENDING_COMPLETION` past expiry |
| Express cancelled cleanup | `EVERY_HOUR` | Soft-delete old cancelled express rows |
| Google appointment sync | queue `appointment-google-sync` | Push/pull; pull can **create** local appointments |

---

## 3. What was tested

### Commands

```bash
git fetch origin development && git checkout development && git pull origin development
# HEAD b8107d4c

cd backend && npx jest --testPathPatterns='appointments|express-booking|public-booking|waitlist|scheduling-settings|online-booking-settings|calendar-display' --no-coverage --forceExit
# 28 suites: 27 passed, 1 failed (appointment-notification.service.spec.ts — 3 tests)
# 136 tests: 133 passed, 3 failed

cd frontend && npx vitest run features/appointments lib/capabilities/route-capability-map.test.ts features/online-booking-settings features/calendar-display-settings
# 9 files, 42 passed
```

Playwright `frontend/e2e/public-booking.spec.ts` exists (BOOK-01/02/03 smoke only). Not re-run here (Chromium install not required for this audit’s Jest/Vitest + API smoke).

### Live API smoke (this VM, seed tenant Spa A `455b743a-…`)

| Check | Result |
|-------|--------|
| `POST /auth/login` OWNER A | 201, JWT `businessId` A |
| `GET /appointments?page=1&limit=5` | 200, 2 rows, sample `CONFIRMED` / `PUBLIC_LINK` |
| `GET /appointments/{id}` | 200 |
| `GET /appointments/{A-id}` as OWNER B | **404 `APPOINTMENT_NOT_FOUND`**, no payload leak |
| `PATCH /appointments/{A-id}/status` as B | **404** (not 403-with-body) |
| `DELETE /appointments/{id}` without `confirm` | **400** confirm required |
| `GET /public/booking/businesses/launch-qa-spa-a` | 200 |
| Public availability without `serviceId` | 400 “Service is required” |
| Public availability with service | 200, nested `days[].slots[]` |
| `POST` public book with extra `businessId` | **400** `property businessId should not exist` (global `forbidNonWhitelisted: true`) |
| `GET /waitlist/summary` | 200 `{ matchedCount: 0, waitingCount: 0 }` |
| `GET /waiting-room-settings` | 200 `waitingStatusEnabled: true` |
| `GET /cancel-reschedule-settings` | 200 |
| `GET /scheduling-settings` | 200 |
| `GET /public/appointments/{random-uuid}` | 404 `APPOINTMENT_NOT_FOUND` |

Prior launch QA on this environment (J2-01/02/03): public book 201 `CONFIRMED` `PUBLIC_LINK`; double-book 409 `BOOKING_SLOT_UNAVAILABLE`; staff GET status `CONFIRMED`. That covers sequential double-book, **not** parallel race.

### Test-pack IDs considered

`C-P0-02`, `CAP-01`, `CAP-02`, `CAP-03`, `J2-01`–`J2-04`, `J2-07`–`J2-09`, `APT-01`–`APT-09`, `BOOK-01`–`BOOK-10`, `OPS-05`. Sales/Stripe (`J2-05/06`) noted only as checkout dependency, not audited.

---

## 4. Findings

| ID | Sev | Layer | Area | Issue | Why it breaks in production | Evidence | Suggested fix direction | Fix needed before main? |
|----|-----|-------|------|-------|----------------------------|----------|-------------------------|-------------------------|
| APT-AUD-01 | P0 | BE | Slot uniqueness | Conflict check then insert; no `SELECT FOR UPDATE`, no exclusion constraint, no serializable txn | Two parallel `POST`s can both see a free slot and both insert blocking rows — double-booked staff, overlapping clients, ops/money fallout | `appointments.service.ts` ~436–505 (`detectScheduleConflicts` then `create`); `appointment.repository.ts` `findStaffBlockingInRange` is a plain `findMany`; Prisma `Appointment` has indexes only (`schema.prisma` ~3857+); public book `isChainedSlotAvailable` then `create` (`public-booking.service.ts` ~530–716); no `$transaction` around check+insert. Sequential J2-02 409 does **not** cover BOOK-06 | Wrap check+insert in a transaction with staff-range lock (advisory lock or `FOR UPDATE` on overlapping rows); add a DB exclusion or unique-range constraint; add a parallel-POST test | **Y** |
| APT-AUD-02 | P0 | BE | Status machine | `PATCH /appointments/:id/status` writes any enum value | Illegal jumps (`COMPLETED`→`CONFIRMED`, `CANCELLED`→`IN_SERVICE`) reopen closed visits, corrupt waiting-room/reports, fight checkout “closed sale” | `UpdateAppointmentStatusDto` is `@IsEnum(AppointmentStatus)` only (`appointment.dto.ts` ~206–209); `updateStatus` sets `status: dto.status` after WAITING gate (`appointments.service.ts` 934–996); `assertCanChangeAppointmentStatus` is permission-only | Explicit allowed-transition map (product table); reject others with `BAD_REQUEST`; unit-test matrix | **Y** |
| APT-AUD-03 | P1 | BE | Resources | `ServiceResourceRequirement` + `AppointmentResourceAssignment` exist; appointment/public-booking TS never reads or writes assignments | Med-spa rooms/devices can be double-booked; APT-04 is unimplemented | Grep: zero `AppointmentResourceAssignment` references in `backend/**/*.ts`; appointments/public-booking have no `resource` conflict check | On create, allocate required resources into `AppointmentResourceAssignment` and overlap-check like staff; 409 if busy | **Y** |
| APT-AUD-04 | P1 | BE | Public create | Appointment row is committed, then service lines (and optional prepaid sale) in follow-up writes | Failed line insert or prepaid sale leaves an orphan appointment; client sees 400 and retries → second booking or stuck paid slot | `public-booking.service.ts` create then loop `appointmentServiceLine.create` (~718–730); prepaid `catch` logs and throws 400 **after** appointment exists (~732–765) | Single Prisma transaction; on prepaid failure, compensate (void appointment or attach sale) before returning 400 | **Y** |
| APT-AUD-05 | P1 | BE | Google sync | Inbound Google events create/update appointments with no staff conflict check | Two-way sync can drop a Google event on top of a local booking; staff calendar shows two visits | `google-calendar-sync.service.ts` `importGoogleEvent` `create` ~475–487 (`UNCONFIRMED` / `GOOGLE_SYNC`); update path moves `startAt`/`endAt` ~464–471 with no `findStaffBlockingInRange` | Reuse staff conflict helper; skip or mark TIME_BLOCK / warn on overlap; do not silently overlap | **N** if Google sync is out of the Appointments `main` cut; **Y** if sync ships with it |
| APT-AUD-06 | P1 | FE | Waitlist | Calendar always renders Waitlist control; BE requires `appointments.waitlist` | Plan with `appointments.list` but without waitlist: toolbar 403s every 30s (`useWaitlistSummary` refetchInterval) | `appointments-calendar-page.tsx` ~271–279 always mounts `WaitlistToolbarButton`; `waitlist.controller.ts` `@RequireCapability('appointments.waitlist')`; route map has no waitlist key | Hide button unless entitlement + `appointments.manage_waitlist`; `enabled` on the summary query | **Y** |
| APT-AUD-07 | P1 | FE | NO_SHOW | Prisma/FE types include `NO_SHOW`; staff lifecycle menu/filters do not | Front-desk cannot mark no-show from calendar/drawer; status only via raw API | `APPOINTMENT_LIFECYCLE_STATUS_OPTIONS` omits `NO_SHOW`/`CANCELLED`; `APPOINTMENT_FILTER_STATUS_OPTIONS` has them but calendar popover uses lifecycle only; cancel is a separate action | Add No-show action (and filter) wired to `PATCH .../status` | **Y** |
| APT-AUD-08 | P1 | FE | Status errors | Status mutation has no `onError` toast | WAITING while waiting-room off (or any 400) looks like a no-op | `use-appointment-status-mutation.ts` only `onSuccess`; drawer `handleStatusChange` only passes `onSuccess` | Add `onError` toast like create/update/express mutations | **N** (does not block data integrity) |
| APT-AUD-09 | P1 | JOB | Reminders | Hourly cron + 1h window; per-row failures only `warn` | A delayed/skipped cron tick permanently misses that reminder offset | `REMINDER_CRON_WINDOW_MS = 60 * 60 * 1000`; `isInWindow` (`appointment-reminder.service.ts` 279–286); scheduler `EVERY_HOUR` (~142–152) | Persist “due” rows / retry; run every 5–15 min; or widen window with sent-flag | **N** |
| APT-AUD-10 | P1 | TEST | Notifications | `AppointmentNotificationService` spec constructs the class with 3 mocks; production ctor has 5 deps | CI cannot guard cancel/reschedule/reminder dispatch; 3 tests fail on this branch of `development` | `appointment-notification.service.ts` ctor injects `CancelRescheduleSettingsRepository` + `ConfigService`; spec `createService()` passes 3 args; Jest: 3 failed | Update spec mocks; keep idempotency-key assertions | **Y** (green tests before promote) |
| APT-AUD-11 | P2 | FE | Dashboard types | `AppointmentSource` in `frontend/lib/types/api.ts` omits `EXPRESS` | Dashboard source breakdowns can drop express rows (C-P2-03) | `api.ts` 155–160 vs Prisma 627–634 vs `appointment-profile.ts` (includes EXPRESS) | Add `EXPRESS` to dashboard union | **N** |
| APT-AUD-12 | P2 | FE | Waiting room | Overflow status menu always lists WAITING | Staff can request WAITING when setting is off → 400; primary Check In CTA already hides it | `appointment-detail-drawer.tsx` maps full `APPOINTMENT_LIFECYCLE_STATUS_OPTIONS`; `appointment-status-actions.tsx` respects `waitingStatusEnabled` | Filter WAITING from overflow when disabled | **N** |
| APT-AUD-13 | P2 | BE | Buffers | Public occupancy overlap is start/end only; staff blocking includes buffers | Public widget can offer a slot inside another visit’s buffer that staff treat as blocked | `appointmentClientOccupancyOverlaps` vs `resolveAppointmentBlockingWindow` (`appointment-blocking.util.ts` 64–76) | Use the same blocking window for public occupancy (product decision on whether buffers are client-visible) | **N** |
| APT-AUD-14 | P2 | TEST | Coverage | No service test for create/updateStatus, public `createBooking`, parallel BOOK-06, Google import | P0/P1 regressions will not fail CI | Spec inventory under `operations/` — utils/settings covered; `appointments.service` create/status and `public-booking.service` create have no spec | Add the three tests in batch 1 with the P0 fixes | **Y** with APT-AUD-01/02 |
| APT-AUD-15 | P2 | FE | Automations | Appointment-booked UI only configures `BOOKED`; `CANCELED`/`RESCHEDULED` exist in API/Prisma | Cancel/reschedule client messages cannot be edited in settings | `AppointmentBookedSettings` + automated-messages event enum | Settings pages or document as out of v1 | **N** |
| APT-AUD-16 | P2 | SEC | Manage token | `clientManageToken` UUID is the sole credential for public cancel/reschedule | Token-in-email leak allows cancel/reschedule within policy (by design); no rotation on view | `findByClientManageToken`; public manage controller `@Public()` | Keep; optional bind/rotate; already 404 on unknown token (smoked) | **N** |
| APT-AUD-17 | P2 | DOC | C-P0-02 | Test-pack still lists C-P0-02 as open P0 | Release owners may re-litigate a fixed bug | `docs/production-consistency-test-cases.md` vs `route-capability-map.ts` + `.test.ts` (8/8, 42 FE tests including CAP-01/02/03) | Mark C-P0-02 done on `development` | **N** |

---

## 5. ID scheme

Findings use `APT-AUD-01` … `APT-AUD-17` (this audit). Do not reuse pack IDs (`APT-01`, `BOOK-06`) as audit IDs; pack IDs are referenced in Evidence / What was tested.

---

## 6. Severity rubric (applied)

- **P0:** data loss, wrong tenant, double-book money/ops break, illegal status, authz hole  
- **P1:** clear bug on common staff/client appointment flows  
- **P2:** edge polish / test gap without a known break  

---

## 7. No issue found (looked solid)

- **Tenant isolation:** repository `activeWhere` always `businessId` + `deletedAt: null`; `findById(businessId, id)` not id-global. Cross-tenant GET/PATCH smoked 404 without body leak.
- **Public tenant binding:** booking resolves business from **slug**; `CreatePublicBookingDto` has no `businessId`; extra field rejected by global `forbidNonWhitelisted`. Manage/express resolve from **token**.
- **Soft-delete + confirm:** `DELETE /appointments/:id` requires `confirm=true` (400 without it). Soft-delete sets `deletedAt`.
- **Capability / module guards:** staff appointments `@RequireModule('appointments')`; express `@RequireCapability('appointments.express_booking')`; waitlist `@RequireCapability('appointments.waitlist')`. CAP-01/02/03 covered in FE map tests. CAP-02 resolver fix is on `development` (`business-effective-capabilities.service.ts` + spec).
- **C-P0-02 in code:** waiting-room / booked / cancel-reschedule / quick-tools use `appointments.list`, not `appointments.access`.
- **Staff vs public split:** anonymous book is not on the authenticated appointments controller.
- **Sequential double-book:** public second POST same slot → 409 `BOOKING_SLOT_UNAVAILABLE` (prior J2-02 + code path).
- **Guessed manage token:** 404 `APPOINTMENT_NOT_FOUND`.
- **Status/source labels on appointments FE:** `appointment-profile.ts` matches Prisma (dashboard `api.ts` source union is the exception — APT-AUD-11).
- **WAITING gate:** BE rejects WAITING when waiting-room disabled (`canTransitionToWaiting`).
- **Express expiry cron:** every minute; cancelled leftovers hourly soft-delete.
- **Audit log:** create / status_changed / Google import call `AuditService.log`.
- **Throttling:** public booking/express endpoints use `@Throttle`.

---

## 8. Recommended fix batches (later agents)

Keep PRs small, backend-first. Do not mix Figma/UI restyle.

**Batch A — P0 slot + status (must before `main`)**  
- IDs: `APT-AUD-01`, `APT-AUD-02`, `APT-AUD-14`  
- Prompt: “Add a transactional staff-slot lock (or equivalent) around appointment create for staff, public, and express; add BOOK-06 parallel POST test. Add an allowed `AppointmentStatus` transition matrix in `updateStatus` with unit tests. Do not redesign UI.”

**Batch B — Public create atomicity**  
- IDs: `APT-AUD-04`  
- Prompt: “Put public booking appointment + service lines + prepaid sale attach in one transaction (or compensating delete). Do not change booking UX.”

**Batch C — Resources**  
- IDs: `APT-AUD-03`  
- Prompt: “On appointment create (staff + public), enforce `ServiceResourceRequirement` and write `AppointmentResourceAssignment` with overlap checks. 409 when the resource is busy.”

**Batch D — FE behavior (no visual redesign)**  
- IDs: `APT-AUD-06`, `APT-AUD-07`, `APT-AUD-08`, `APT-AUD-12`  
- Prompt: “Gate waitlist chrome on `appointments.waitlist`; add No-show status action; toast status PATCH errors; hide WAITING in overflow when waiting-room is off.”

**Batch E — tests / jobs / docs (can trail)**  
- IDs: `APT-AUD-10`, `APT-AUD-09`, `APT-AUD-11`, `APT-AUD-13`, `APT-AUD-15`, `APT-AUD-17`  
- Prompt: “Fix `appointment-notification.service.spec.ts` constructor mocks; optionally tighten reminder cron; add EXPRESS to dashboard `AppointmentSource`; mark C-P0-02 done in the test pack.”

**Batch F — Google (only if sync is in the Appointments cut)**  
- ID: `APT-AUD-05`

---

## 9. Promotion note

**This PR is audit-only.** It must not be used as a vehicle to merge Appointments into `main`.

Do **not** promote Appointments `development` → `main` until:

- **P0** `APT-AUD-01` and `APT-AUD-02` are fixed **or formally waived** by a release owner, and  
- **P1** `APT-AUD-10` (red notification specs) is fixed so CI is trustworthy for this domain.

P1 resource allocation (`APT-AUD-03`) should be waived only if production med spas will not attach rooms/devices to services in this cut.
