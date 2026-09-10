# Feature runbook: Chatbots, automations, webhooks

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Chatbot builder + public chat widgets; automation workflows (triggers/actions); inbound webhook event processing (Meta/Stripe workers). Platform admin for chatbots/automations.

---

## 2. Current implementation map

| Area | Backend | Frontend | Notes |
|------|---------|----------|-------|
| Chatbots | `communications/chatbots` | `chatbots`, `public-chatbot` | `chatbots`, `public/chatbots`, `platform/chatbots`, widgets |
| Automations | `communications/automations` | `automations` | `automations/workflows`, `automations/metadata`, platform siblings |
| Webhooks module | `communications/webhooks/` | — | **Worker processors** (meta/stripe), not a rich HTTP CRUD module |

**App routes:** `business/settings/chatbots/**`, `business/automations`, `business/settings/automations|automation-*`; platform chatbots/automations; public `chat/[publicKey]`, `widget/chat*`, `widget/chatbot/*`.

**Prisma:** `Chatbot*`, `AutomationWorkflow*`, `WebhookEvent`, …

---

## 3. Public vs authenticated APIs

- Public chatbot widget APIs.
- Authenticated workflow CRUD.
- Provider webhooks elsewhere under `webhooks/*` + worker consumers.

---

## 4. Permissions / capabilities

- Modules: `automations`, `ai_agents` (chatbots).
- Staff: `automations.manage`.

---

## 5. Cross-feature dependencies

- Conversations/messages for sends; appointments triggers; contacts; integrations webhooks.

---

## 6. Patterns to copy

- Workflow create dialog / metadata APIs on FE.
- Automation appointment trigger services on BE.

---

## 7. Do-not / pitfalls

- Do not put heavy webhook processing in API request path — workers own it.
- Public chatbot keys must not expose privileged business APIs.
- Time-window utils exist for workflows — reuse them.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=automation
```

---

## 9. Related docs

- [conversations.md](./conversations.md)
- [email-sms-notifications.md](./email-sms-notifications.md)
- [oauth-integrations.md](../integrations/oauth-integrations.md)
- [INDEX](../../INDEX.md)
