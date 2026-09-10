# Feature runbook: Appointments and calendars

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Staff book and manage appointments; configure calendars, availability, scheduling options; automated appointment messages; related waiting-room / cancel-reschedule settings (also covered in ops runbook).

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `operations/appointments/` (+ nested automated-messages, cancel-reschedule, waiting-room); `operations/calendars/` (+ `display-settings/`); `operations/scheduling-settings/` |
| Controllers | `appointments`; `calendars`; `scheduling-settings`; `appointment-automated-messages`; display/waiting-room/cancel-reschedule controllers |
| Frontend | `appointments`, `calendars`, `scheduling-settings`, `appointment-automated-messages`, `calendar-display-settings`, … |
| App routes | `business/appointments`; `business/settings/calendars/**`; `business/settings/scheduling-options`; related settings pages |
| Prisma | `Appointment`, `AppointmentServiceLine`, `Calendar`, `CalendarStaff`, `CalendarAvailability`, `CalendarException`, `BusinessSchedulingSettings`, … |

---

## 3. Public vs authenticated APIs

- Authenticated staff appointment/calendar APIs.
- Public booking is a separate module (`public-booking`) — do not overload appointments controllers for anonymous book-by-slug.

---

## 4. Permissions / capabilities

- Modules: `appointments`, `calendar`.
- Staff: `appointments.*`; settings `settings.calendars.manage`.
- Express booking capability: `appointments.express_booking` (see public-booking runbook).

---

## 5. Cross-feature dependencies

- Services, resources, contacts, staff membership.
- Payments for deposits.
- Public booking / online-booking-settings.
- Google Calendar sync under integrations.

---

## 6. Patterns to copy

- Appointment drawer: `features/appointments/components/drawer/*` — reuse shared `DrawerShell` / form recipes.
- Calendar creation: `features/calendars/components/calendar-creation-flow.tsx`.

---

## 7. Do-not / pitfalls

- Calendar filter chrome may be intentionally feature-specific (see design-system “Intentionally feature-specific” list) — do not “fix” into shared system without product reason.
- Availability/exceptions logic is subtle — extend existing utils rather than reimplementing.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=appointment
npm test --prefix frontend -- appointment
```

Manual: create calendar → book appointment → reschedule → check automated message config.

---

## 9. Related docs

- [public-booking.md](./public-booking.md)
- [tasks-work-items-ops.md](./tasks-work-items-ops.md)
- [contacts-leads-pipelines.md](../crm/contacts-leads-pipelines.md)
- [INDEX](../../INDEX.md)
