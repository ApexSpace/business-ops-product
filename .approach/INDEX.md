# PandaCue agent feature index

Point Cursor / Linear agents at a runbook path instead of pasting domain lore into tickets.

**Template:** [`_template-feature.md`](./_template-feature.md)  
**Deep OAuth / portals:** [`social-media-platforms.md`](./social-media-platforms.md)  
**Global law:** [`../AGENTS.md`](../AGENTS.md)  
**UI law:** [`../.cursor/rules/frontend-design-system.mdc`](../.cursor/rules/frontend-design-system.mdc) + [`../frontend/REUSE.md`](../frontend/REUSE.md)  
**Backend law:** [`../.cursor/rules/backend-conventions.mdc`](../.cursor/rules/backend-conventions.mdc)

Legend: `[x]` = runbook present.

## How to cite in a Linear / Cursor ticket

```text
Follow AGENTS.md.
UI: .cursor/rules/frontend-design-system.mdc + frontend/REUSE.md
Backend: .cursor/rules/backend-conventions.mdc
Feature: .approach/features/<domain>/<file>.md
```

## Spot-check prompts (sanity)

| Prompt intent | Must resolve via |
|---------------|------------------|
| Implement Social Planner calendar UI to Figma | `communications/social-planner.md` + design-system + REUSE |
| Add form field type + public submit | `communications/forms.md` + field registry paths |
| Collect Stripe payment on invoice | `finance/payments-and-stripe.md` + `finance/invoices-estimates.md` |

## Module coverage checklist (backend folders → runbook)

| Backend area | Runbook |
|--------------|---------|
| communications/social-planner | communications/social-planner.md |
| communications/forms | communications/forms.md |
| communications/conversations, messages | communications/conversations.md |
| communications/email, sms, notifications | communications/email-sms-notifications.md |
| communications/chatbots, automations, webhooks | communications/chatbots-automations-webhooks.md |
| finance/payments + integrations/.../stripe | finance/payments-and-stripe.md |
| finance/invoices, estimates | finance/invoices-estimates.md |
| finance/products, packages, gift-cards, memberships, offers, custom-fees, checkout-advanced-settings | finance/catalog-commerce.md |
| operations/appointments, calendars, scheduling-settings | operations/appointments-calendars.md |
| operations/public-booking, express-booking, online-booking-settings | operations/public-booking.md |
| operations/tasks, work-items, waitlist, time-clock, resources (+ waiting-room, cancel-reschedule, display-settings) | operations/tasks-work-items-ops.md |
| crm/* | crm/contacts-leads-pipelines.md |
| integrations/* | integrations/oauth-integrations.md |
| platform/auth, business, membership, capabilities, tiers, addons, plan-groups | platform/auth-business-capabilities.md |
| platform/billing, snapshots, data-io, trial-signup, jobs, audit, platform, operations | platform/billing-snapshots-admin.md |
| reports, storage; core/realtime; settings/team/whatsapp FE | cross/reports-storage-realtime-shell.md |

## Communications

- [x] [features/communications/social-planner.md](./features/communications/social-planner.md)
- [x] [features/communications/forms.md](./features/communications/forms.md)
- [x] [features/communications/conversations.md](./features/communications/conversations.md)
- [x] [features/communications/email-sms-notifications.md](./features/communications/email-sms-notifications.md)
- [x] [features/communications/chatbots-automations-webhooks.md](./features/communications/chatbots-automations-webhooks.md)

## Finance

- [x] [features/finance/payments-and-stripe.md](./features/finance/payments-and-stripe.md)
- [x] [features/finance/invoices-estimates.md](./features/finance/invoices-estimates.md)
- [x] [features/finance/catalog-commerce.md](./features/finance/catalog-commerce.md) — products, packages, gift-cards, memberships, offers, custom-fees, checkout-advanced

## Operations

- [x] [features/operations/appointments-calendars.md](./features/operations/appointments-calendars.md)
- [x] [features/operations/public-booking.md](./features/operations/public-booking.md)
- [x] [features/operations/tasks-work-items-ops.md](./features/operations/tasks-work-items-ops.md) — tasks, work-items, waitlist, time-clock, resources, waiting-room, cancel-reschedule, business-hours, calendar-display

## CRM

- [x] [features/crm/contacts-leads-pipelines.md](./features/crm/contacts-leads-pipelines.md)

## Integrations

- [x] [features/integrations/oauth-integrations.md](./features/integrations/oauth-integrations.md)

## Platform

- [x] [features/platform/auth-business-capabilities.md](./features/platform/auth-business-capabilities.md)
- [x] [features/platform/billing-snapshots-admin.md](./features/platform/billing-snapshots-admin.md) — billing, snapshots, data-io, trial-signup, jobs, audit, platform UI

## Cross-cutting

- [x] [features/cross/reports-storage-realtime-shell.md](./features/cross/reports-storage-realtime-shell.md) — reports, storage, realtime, dashboard, settings, team, whatsapp-settings
