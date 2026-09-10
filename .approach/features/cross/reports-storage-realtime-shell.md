# Feature runbook: Reports, storage, realtime, shell settings

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

Cross-cutting surfaces used across domains.

---

## 1. Purpose / user-facing surface

Business reports dashboards; file uploads (R2); realtime invalidation/events; business dashboard; settings shell; team management UI; WhatsApp template settings.

---

## 2. Current implementation map

| Area | Backend | Frontend | Notes |
|------|---------|----------|-------|
| Reports | `backend/libs/modules/reports/` | `features/reports` | providers/registry pattern; controller `reports` |
| Storage | `backend/libs/modules/storage/` | (no dedicated `features/storage`; used via shared upload flows) | `storage` controllers; `FileAsset` |
| Realtime | `backend/libs/core/realtime/` | `features/realtime` | Socket.IO + Redis adapter |
| Dashboard | various aggregations / platform dashboard | `features/dashboard` | `business/dashboard`; platform dashboard under platform module |
| Settings shell | business profile APIs in platform/business | `features/settings` | `business/settings/**` |
| Team | `platform/membership` members APIs | `features/team` | `business/settings/team`, `business/members` |
| WhatsApp settings | `integrations/whatsapp` + templates | `features/whatsapp-settings` | `business/settings/whatsapp`; template send utils |

**Prisma:** `FileAsset`; `WhatsAppMessageTemplate`; reports are mostly compute providers (no single `Report` model).

---

## 3. Public vs authenticated APIs

- Storage confirm/upload typically authenticated.
- Reports authenticated + `reports` module capability.
- Realtime requires authenticated business socket context.

---

## 4. Permissions / capabilities

- Module: `reports`.
- Staff: `reports.access`, `settings.team.manage`, WhatsApp template keys under conversations/settings.
- Settings options keys under `settings.*` in capability registry.

---

## 5. Cross-feature dependencies

- Almost every feature may upload files or subscribe to realtime events.
- WhatsApp settings feeds conversations/templates.
- Team permissions gate UI across the app.

---

## 6. Patterns to copy

- Reports: add a provider under `reports/providers` and register in registry (see `DEFERRED_REPORTS.md` for deferred items).
- Realtime: `useBusinessEvents` invalidation pattern (AGENTS.md).
- Storage README: `frontend/lib/storage/README.md`.

---

## 7. Do-not / pitfalls

- Do not bypass storage confirm flow / `FileAsset` tracking for production uploads.
- Do not mutate React Query caches blindly on realtime — invalidate keys.
- WhatsApp templates must stay in sync with Meta-approved templates.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=reports
# Redis up required for realtime
npm run redis:up
```

---

## 9. Related docs

- [conversations.md](../communications/conversations.md)
- [oauth-integrations.md](../integrations/oauth-integrations.md)
- [auth-business-capabilities.md](../platform/auth-business-capabilities.md)
- [backend/libs/modules/reports/DEFERRED_REPORTS.md](../../../backend/libs/modules/reports/DEFERRED_REPORTS.md)
- [INDEX](../../INDEX.md)
