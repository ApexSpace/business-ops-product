# Feature runbook: Public booking and express booking

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Public book-by-slug / embed calendar flows; client manage-by-token; express booking links; business settings for online booking and express booking.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `operations/public-booking/`, `operations/express-booking/`, `operations/online-booking-settings/` |
| Controllers | `public/booking`; `public/appointments` (manage); `public/express`; express admin under appointments; `online-booking-settings`; `quick-tools` |
| Frontend | `public-booking`, `express-booking`, `online-booking-settings`, `public-appointment-manage`, `quick-tools` |
| App routes | `book/[slug]`, `booking/[slug]`, `embed/booking/[slug]`, `calendar/[slug]`, `embed/calendar/[slug]`, `manage/[token]`, `express/[token]`; settings `business/settings/online-booking/**`, `.../express-booking` |
| Prisma | `BusinessOnlineBookingSettings`, `BookingWaitlistEntry`, appointment models; no dedicated `ExpressBooking` model name |

Business hours API is nested on online-booking-settings (`business-hours`), model `BusinessHours`.

---

## 3. Public vs authenticated APIs

- Heavy `@Public()` surface for booking/manage/express.
- Authenticated settings for online booking / express configuration.

---

## 4. Permissions / capabilities

- Module: `online_booking`.
- Capability: `appointments.express_booking`.
- Staff: `settings.online_booking.manage`.

---

## 5. Cross-feature dependencies

- Appointments, calendars, services, staff, payments (deposits), waitlist.
- Contacts created/linked on public book.

---

## 6. Patterns to copy

- Public booking page composition: `features/public-booking/components/public-booking-page.tsx`.
- E2E smoke: `frontend/e2e/public-booking.spec.ts`.

---

## 7. Do-not / pitfalls

- Never trust client-supplied business id on public endpoints — resolve from slug/token.
- Keep embed and full-page variants using shared feature components.
- CORS / public URL env (`FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`) matter for embeds.

---

## 8. Verify locally

```bash
npm run test:e2e --prefix frontend -- public-booking
```

Manual: open `/book/{slug}` → complete booking → manage via token.

---

## 9. Related docs

- [appointments-calendars.md](./appointments-calendars.md)
- [payments-and-stripe.md](../finance/payments-and-stripe.md)
- [INDEX](../../INDEX.md)
