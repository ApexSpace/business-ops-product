# Feature runbook: CRM — contacts, leads, pipelines, notes, services

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Core CRM: contacts (tags), leads, pipeline boards/stages, notes, service catalog/categories. Platform views for contacts/pipelines/industries.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `crm/contacts`, `crm/leads`, `crm/pipelines`, `crm/notes`, `crm/services`, `crm/industries` |
| Controllers | `contacts`, `contact-tags`, `leads`, `pipelines`, `pipelines/:id/stages`, `notes`, `services`, `service-categories`; platform siblings |
| Frontend | `contacts`, `leads`, `pipelines`, `notes`, `services` |
| App routes | `business/contacts/**`, `leads`, `pipelines`, `notes`, `services`, `crm`; settings pipelines/services; platform pipelines/industries |
| Prisma | `Contact`, `Tag`, `ContactTag`, `Lead`, `Pipeline`, `PipelineStage`, `Note`, `Service`, `ServiceCategory`, … |

---

## 3. Public vs authenticated APIs

- Primarily authenticated business/platform APIs.
- Public booking/forms may create contacts without using CRM public controllers.

---

## 4. Permissions / capabilities

- Modules: `contacts`, `leads`, `pipelines`, `notes`, `services`.
- FE: `contacts.*`, `pipelines.manage`.
- Staff: `contacts.*`, `pipelines.*`.

---

## 5. Cross-feature dependencies

- Appointments, invoices, conversations, sales all hang off contacts.
- Services used by booking and appointment lines.

---

## 6. Patterns to copy

- **Gold standard CRUD:** contacts module + `features/contacts` (see AGENTS.md).
- Pipelines: `features/pipelines` board utils/stages.

---

## 7. Do-not / pitfalls

- Always `businessId` + soft delete on repositories.
- Audit on create/update/delete (contacts service is the reference).
- Do not import `@/lib/api/client` from `app/` pages.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=contact
npm test --prefix frontend -- contact
```

---

## 9. Related docs

- [AGENTS.md](../../../AGENTS.md) reference implementations
- [INDEX](../../INDEX.md)
