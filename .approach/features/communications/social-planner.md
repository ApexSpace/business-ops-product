# Feature runbook: Social Planner

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Business staff schedule and publish social posts (multi-network), view calendar/posts, and manage comments/engagement where implemented. Connections live under Settings → Integrations.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `backend/libs/modules/communications/social-planner/` |
| Controllers | `social-planner` ; `social-planner/comments` |
| Frontend | `frontend/features/social-planner/` |
| App routes | `frontend/app/(business)/business/social-planner/**` (calendar, new, edit, posts, comments) |
| Prisma | `SocialPost`, `SocialPostTarget`, `SocialPostMedia`, `SocialPostMetrics`, `SocialComment` |
| Workers | publish / metrics / comment ingestion processors under social-planner workers |

OAuth tokens and provider adapters also touch `backend/libs/modules/integrations/integrations/` (see related docs).

---

## 3. Public vs authenticated APIs

- Authenticated business APIs under `social-planner` (Bearer + business membership).
- No public anonymous social-planner HTTP API.
- Provider webhooks may update status via integrations/webhook workers.

---

## 4. Permissions / capabilities

- Module key: `social_planner` (CRUD-style features in capability registry).
- Staff: `social_planner.access` / `social_planner.manage`.
- Integrations connect requires integrations manage permissions.

---

## 5. Cross-feature dependencies

- **Upstream:** Integrations OAuth (per-network connect), storage/R2 for media, contacts optional.
- **Downstream:** Worker publish jobs; engagement adapters per network.

---

## 6. Patterns to copy

- Backend adapters: `social-planner/adapters/*`.
- Composer destination fields: `frontend/features/social-planner/components/*-destination-fields.tsx`.
- UI: `.cursor/rules/frontend-design-system.mdc` + `frontend/REUSE.md`.

---

## 7. Do-not / pitfalls

- Do not invent a second OAuth path; use existing `/api/oauth/...` BFF + Nest oauth controllers.
- Least privilege: separate OAuth flows per product (not mega-consent).
- Never commit tokens; encryption via `INTEGRATION_ENCRYPTION_KEY`.
- Media public URLs need `R2_PUBLIC_BASE_URL` for pull-by-URL providers (e.g. TikTok).

---

## 8. Verify locally

```bash
# Backend unit tests touching social-planner
npm test --prefix backend -- --testPathPattern=social-planner
```

Manual: connect a test network → compose → schedule/post → confirm worker status.

---

## 9. Related docs

- [INDEX](../../INDEX.md)
- Deep OAuth/portals: [social-media-platforms.md](../../social-media-platforms.md)
- [oauth-integrations.md](../integrations/oauth-integrations.md)
- [AGENTS.md](../../../AGENTS.md)
