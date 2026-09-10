# Feature runbook: Operations extras (tasks, work items, waitlist, time clock, resources, booking settings)

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Internal tasks and work items; booking waitlist; staff time clock / time cards; bookable resources/groups; waiting-room and cancel/reschedule policies; business hours; calendar display preferences.

---

## 2. Current implementation map

| Area | Backend | Frontend | Controllers / notes |
|------|---------|----------|---------------------|
| Tasks | `operations/tasks` | `tasks` | `tasks` |
| Work items | `operations/work-items` | `work-items` | `work-items`, `platform/work-items` |
| Waitlist | `operations/waitlist` | `waitlist` | `waitlist` |
| Time clock | `operations/time-clock` | `time-clock` | `time-clock`, `time-cards` |
| Resources | `operations/resources` | `resources` | `resources`, `resource-groups` |
| Waiting room | under appointments | `waiting-room-settings` | `waiting-room-settings` |
| Cancel/reschedule | under appointments | `cancel-reschedule-settings` | `cancel-reschedule-settings` |
| Business hours | API on `online-booking-settings` | `business-hours` | `GET/PUT online-booking-settings/business-hours` |
| Calendar display | `calendars/display-settings` | `calendar-display-settings` | `calendar-display-settings` |

**Prisma:** `Task`, `WorkItem`, `BookingWaitlistEntry`, `TimeCard`, `Resource`, `ResourceGroup`, `BusinessWaitingRoomSettings`, `BusinessCancelRescheduleSettings`, `BusinessHours`, `BusinessHourException`, `BusinessCalendarDisplaySettings`, `StaffWorkSchedule*`.

**App routes:** `business/tasks|work-items|time-clock|time-cards`; settings `resources|waiting-room|cancel-reschedule|business-hours|display-preferences`; platform `platform/work-items`.

---

## 3. Public vs authenticated APIs

- Mostly authenticated business APIs; waitlist may interact with public booking flows.
- Platform work-items for ops admins.

---

## 4. Permissions / capabilities

- Modules: `tasks`, `work_items`, `time_clock`, `resources`, `appointments.waitlist`.
- FE/staff: `time-clock.view`, `time-cards.manage`, `work_items.*`.

---

## 5. Cross-feature dependencies

- Appointments/public booking for waitlist and policies.
- Team/membership for time clock staff.
- Services for resources.

---

## 6. Patterns to copy

- Work items view switcher / list patterns on FE.
- Settings screens for waiting-room and cancel-reschedule.

---

## 7. Do-not / pitfalls

- Business hours are **not** a standalone Nest module folder — extend online-booking-settings carefully.
- Waitlist shares `BookingWaitlistEntry` with public booking — keep statuses consistent.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=work-item
npm test --prefix backend -- --testPathPattern=waitlist
```

---

## 9. Related docs

- [appointments-calendars.md](./appointments-calendars.md)
- [public-booking.md](./public-booking.md)
- [INDEX](../../INDEX.md)
