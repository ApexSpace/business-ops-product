# Feature runbook: Email, SMS, notifications

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Business email notification templates/preferences (Resend), SMS delivery via Twilio (often through conversations), and channel notification preferences UI.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Email | `backend/libs/modules/communications/email/` — controllers `email-notifications`, `webhooks/resend` |
| SMS | `backend/libs/modules/communications/sms/` + Twilio under `integrations/twilio` / webhook `webhooks/twilio/sms` |
| Notifications | `backend/libs/modules/communications/notifications/` — `notification-channel-preferences` |
| Frontend | `email-notifications`, `notifications` (SMS UX mostly via conversations / integrations / whatsapp-settings) |
| App routes | `business/settings/notifications` |
| Prisma | `EmailTemplate`, `EmailMessage`, `BusinessEmailPreference`, `BusinessNotificationChannelPreference`, `PlatformSmsSuppression` |
| Workers | email send processors under email workers |

---

## 3. Public vs authenticated APIs

- Authenticated preference/template management.
- Provider webhooks `@Public()` with signature verification (Resend/Svix, Twilio).

---

## 4. Permissions / capabilities

- Module: `sms` (and related notification settings permissions).
- Sending paths may also require `conversations.send` when inbox-originated.

---

## 5. Cross-feature dependencies

- Conversations outbound, appointment automated messages, automations actions, auth/trial emails.

---

## 6. Patterns to copy

- Preference DTOs under notifications.
- Email env validation modules under backend core/config.

---

## 7. Do-not / pitfalls

- Do not send email/SMS synchronously in API request for bulk — enqueue jobs.
- Respect suppressions / opt-outs (`PlatformSmsSuppression`, preferences).
- Keep webhook handlers idempotent.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=email
```

---

## 9. Related docs

- [conversations.md](./conversations.md)
- [chatbots-automations-webhooks.md](./chatbots-automations-webhooks.md)
- [INDEX](../../INDEX.md)
