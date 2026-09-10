# Feature runbook: Integrations (OAuth hub)

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Settings → Integrations: connect/disconnect providers (social, Google Calendar, Stripe, WhatsApp, email/SMS providers). Platform integrations admin. OAuth callback landing.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend hub | `backend/libs/modules/integrations/integrations/` |
| Related | `integrations/whatsapp`, `integrations/twilio`, `integrations/google-calendar-sync` |
| Controllers | `integrations`, `integrations/business`, resources under `:providerKey`; `integrations/oauth/*`; `platform/integrations`; webhooks `webhooks/meta|stripe|twilio/sms` |
| Frontend | `frontend/features/integrations/` |
| App routes | `business/settings/integrations`; `platform/settings/integrations`; `oauth/callback`; Next BFF `frontend/app/api/oauth/**/start` |
| Prisma | `IntegrationProvider`, `BusinessIntegration`, `IntegrationResource`, `PlatformIntegration` |

Provider start map documented in `.approach/social-media-platforms.md`.

---

## 3. Public vs authenticated APIs

- OAuth start typically session-authenticated business user; callbacks are special public/callback routes.
- Webhooks: signature-verified public endpoints.

---

## 4. Permissions / capabilities

- `settings.integrations.*` / FE staff `integrations.manage`, `settings.integrations.manage`.
- Per-provider options in capability registry.

---

## 5. Cross-feature dependencies

- Social planner publish, conversations WhatsApp/SMS, calendar sync, Stripe Connect payments, email sending.

---

## 6. Patterns to copy

- OAuth popup helper: `features/integrations/utils/oauth-popup.ts`.
- Provider grid: `features/integrations/components/integration-grid.tsx`.
- Token encryption + refresh services per provider under integrations.

---

## 7. Do-not / pitfalls

- Do not use raw `request.url` behind Docker for OAuth redirects — use `frontend/lib/oauth/oauth-app-origin.ts` + `NEXT_PUBLIC_APP_URL`.
- Separate OAuth flows per product scopes.
- Never log access tokens.

---

## 8. Verify locally

```bash
npm test --prefix frontend -- oauth
```

Manual: start connect popup for one provider in a non-prod app URL.

---

## 9. Related docs

- [social-media-platforms.md](../../social-media-platforms.md)
- [social-planner.md](../communications/social-planner.md)
- [payments-and-stripe.md](../finance/payments-and-stripe.md)
- [INDEX](../../INDEX.md)
