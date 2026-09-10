# Feature runbook: \<Name\>

**Product:** PandaCue  
**Status:** current implementation (code as of doc date)  
**Last updated:** YYYY-MM-DD

Compact agent context. Prefer facts from the repo over product vision. Do not put secrets here.

---

## 1. Purpose / user-facing surface

- Who uses it (business staff, public, platform admin)
- Primary screens / flows

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend module(s) | `backend/libs/modules/...` |
| Key controllers | `...` → route prefix `...` |
| Frontend feature(s) | `frontend/features/...` |
| App routes | `frontend/app/...` |
| Prisma models | `...` |
| Workers / jobs | `...` (if any) |

---

## 3. Public vs authenticated APIs

- Authenticated (business / platform): …
- Public / unauthenticated: …
- Webhooks: …

---

## 4. Permissions / capabilities

- Module / capability keys: …
- Staff permission keys (if any): …
- Guards used: `BusinessRolesGuard`, `BusinessCapabilityGuard`, `@RequireModule`, `@RequireCapability`, `@Public`

---

## 5. Cross-feature dependencies

- Upstream: …
- Downstream: …

---

## 6. Patterns to copy

- Backend reference: …
- Frontend reference: …
- UI: follow `.cursor/rules/frontend-design-system.mdc` and `frontend/REUSE.md`

---

## 7. Do-not / pitfalls

- …

---

## 8. Verify locally

```bash
# targeted tests / manual checks
```

---

## 9. Related docs

- [AGENTS.md](../AGENTS.md) (path relative from this file as appropriate)
- …
