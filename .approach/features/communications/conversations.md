# Feature runbook: Conversations (inbox)

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Staff inbox for multi-channel conversations (SMS, WhatsApp, etc.), canned responses, contact-linked threads. Platform has a parallel conversations view.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `backend/libs/modules/communications/conversations/` |
| Messages pipeline | `backend/libs/modules/communications/messages/` (**worker-oriented**, not a rich HTTP CRUD module) |
| Controllers | `conversations`; `canned-responses`; contact-scoped conversation routes; `platform/conversations` |
| Frontend | `frontend/features/conversations/` |
| App routes | `business/conversations`; `platform/conversations` |
| Prisma | `Conversation`, `ConversationMessage`, `ConversationParticipant`, `ConversationNote`, `CannedResponse` |

Realtime: `backend/libs/core/realtime/` + frontend `features/realtime`.

---

## 3. Public vs authenticated APIs

- Authenticated business/platform conversation APIs.
- Provider ingress via webhooks (Twilio SMS, Meta WhatsApp) — not public browser APIs.
- Outbound send often capability-gated (`conversations.send`).

---

## 4. Permissions / capabilities

- Module: `conversations` (`inbox`, `read`, `send`, WhatsApp template features).
- Staff: `conversations.access`, `conversations.view_all`, `conversations.send`.
- FE: `PERMISSIONS["conversations.send"]`.

---

## 5. Cross-feature dependencies

- Contacts identity merge / linking.
- Integrations: Twilio, WhatsApp (`integrations/whatsapp`, `whatsapp-settings` UI).
- Notifications preferences may affect delivery.

---

## 6. Patterns to copy

- Inbox components under `features/conversations/components/inbox/`.
- Session window utilities for WhatsApp in conversations services.

---

## 7. Do-not / pitfalls

- Do not add HTTP controllers under `messages/` without checking worker design — outbound is job-driven.
- Respect WhatsApp 24h session window rules in existing services.
- Always scope by `businessId`.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=conversation
```

Manual: open inbox → send test SMS/WhatsApp in test env → confirm thread + realtime.

---

## 9. Related docs

- [oauth-integrations.md](../integrations/oauth-integrations.md)
- [chatbots-automations-webhooks.md](./chatbots-automations-webhooks.md)
- [reports-storage-realtime-shell.md](../cross/reports-storage-realtime-shell.md) (whatsapp-settings, realtime)
- [INDEX](../../INDEX.md)
