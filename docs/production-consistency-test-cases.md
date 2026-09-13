# PandaCue — Production consistency issues and test cases

**Product:** PandaCue (med spa / aesthetics operations)  
**Audience:** QA, engineering, and release owners taking the app to production  
**Code analyzed:** `development` branch of `ApexSpace/business-ops-product` (this is where `.approach/`, `.agents/`, `.cursor/`, and `AGENTS.md` live). `main` is a smaller subset and is **not** the production surface described here.  
**Related existing matrix:** `docs/platform-operations-testing.md` (entitlement campaigns — do not duplicate; extend).

---

## How to use this document

1. Treat **Section 2** as the production-risk punch list (fix or explicitly accept before go-live).
2. Run **Section 4** journeys first — they are the intended staff/client day.
3. Use **Section 5** as the per-module regression pack, aligned to `.approach/features/**`.
4. Automate **P0/P1** cases in Playwright (frontend) and Jest (backend) before launch; keep P2 as a manual/UAT pack.

**Conventions**

| Field | Meaning |
|-------|---------|
| **ID** | Stable case id (`AUTH-01`, `BOOK-03`, …) |
| **Layer** | `E2E` UI, `API` HTTP, `JOB` worker/scheduler, `SEC` tenant/auth isolation |
| **Sev** | `P0` launch blocker · `P1` must-fix soon · `P2` harden after launch |
| **Expect** | Pass criteria against the *intended* flow, not a placeholder |

Unless a case says otherwise: all tenant data is scoped by JWT `businessId`; deletes require `?confirm=true`; API envelope is `{ data, meta, error }`.

**Accounts needed**

- Platform: `SUPER_ADMIN` and `PLATFORM_ADMIN`
- Business A (med spa): `OWNER`, `ADMIN`, `MEMBER` with a published plan that includes appointments, payments, conversations, forms, social planner
- Business B (second tenant): same modules, used only for isolation
- Public: no login (booking slug, invoice token, form publicKey, chatbot publicKey)
- Stripe **test** Connect account + Stripe **test** platform billing (never mix live keys)
- Meta/Twilio test apps only in a non-prod environment

---

## 1. Intended application (from project docs)

PandaCue is a multi-tenant operations suite for med spas (Mangomint-class): scheduling, CRM, checkout, memberships/packages, inbox, social, and platform admin.

| Surface | Who | Stack |
|---------|-----|--------|
| Business app | Staff | Next.js `frontend/` → BFF `/api/backend/*` → Nest `api` (`/api/v1`) |
| Public widgets | Clients | booking, invoice pay, forms, chatbot, packages/gift cards/memberships, trial |
| Platform admin | CodeSol operators | `/platform/*` |
| Workers | System | BullMQ: webhooks, email/SMS, social publish, calendar sync, jobs |
| Scheduler | System | reminders, due-status, cleanups |

**Sources of “intended flow”**

| Need | Path |
|------|------|
| Global law | `AGENTS.md` |
| Backend rules | `.cursor/rules/backend-conventions.mdc` |
| Frontend UI law | `.cursor/rules/frontend-design-system.mdc` + `frontend/REUSE.md` |
| Feature maps | `.approach/INDEX.md` → `.approach/features/<domain>/*.md` |
| Entitlements ops | `docs/platform-operations-testing.md` |
| Product copy (sales, inbox, services, memberships, payments) | `feature-docs/Application/**` |

**Module keys in the capability registry (29):**  
`contacts`, `leads`, `pipelines`, `notes`, `work_items`, `social_planner`, `tasks`, `conversations`, `sms`, `appointments`, `calendar`, `online_booking`, `time_clock`, `resources`, `services`, `estimates`, `invoices`, `payments`, `sales`, `gift_cards`, `packages`, `memberships`, `offers`, `products`, `forms`, `automations`, `ai_agents`, `reports`, `settings`

Three **parallel permission namespaces** exist and must not be mixed in tests:

1. **Capability options** — e.g. `appointments.list`, `payments.transactions.list` (plan entitlements)
2. **Staff permissions** — e.g. `appointments.access`, `payments.access` (`staff-permission-registry.ts`, FE + BE)
3. **Legacy option `permissionKey`s** — e.g. `calendar.appointments.read`

---

## 2. Consistency issues (frontend ↔ backend)

These are defects or contract gaps found by comparing `.approach` runbooks to Nest controllers, Prisma enums, and Next routes.

### P0 — fix or formally waive before production

| ID | Issue | Why it matters | Where |
|----|--------|----------------|-------|
| **C-P0-01** | Public estimate page is a stub; no public estimate API | **WAIVED FOR LAUNCH** (tracked post-launch). Public `/estimate/[token]` is an unavailable state — not a working client review page. `estimate.publicUrl` merge tag is stubbed so automations/emails cannot send public estimate links. Staff estimate CRUD remains. | FE `frontend/app/estimate/[token]/page.tsx`; BE `finance/estimates` staff CRUD only (no public API). |
| **C-P0-02** | Route capability map uses **staff** keys as if they were **capability** keys | Waiting-room, appointment-booked, cancel-reschedule, quick-tools, payment-account settings check `appointments.access` / `payments.access`. Those keys are **not** capability options. Exact match never hits; access falls back to “any `appointments.*` / `payments.*` module key”. Feature-level gating is wrong. | `frontend/lib/capabilities/route-capability-map.ts` |
| **C-P0-03** | Shared API contract is empty | `@business-automation/api-contract` is a placeholder (`paths = Record<string, never>`). FE types are hand-copied. Drift is guaranteed as you ship. | `packages/api-contract`, missing `backend/openapi.json` |
| **C-P0-04** | Almost no E2E coverage | Playwright has **one** file (`public-booking.spec.ts`) that only checks unavailable slug + redirects. Production flows below are unguarded. | `frontend/e2e/` |

### P1 — must-fix for a trustworthy launch

| ID | Issue | Why it matters | Where |
|----|--------|----------------|-------|
| **C-P1-01** | Auth orphans: `POST /auth/register` and email verify exist on BE with **no FE pages** | Self-serve signup is trial-widget oriented; calling register/verify is undefined UX. Attackers can still hit the API. | `auth.controller.ts` vs `(auth)` routes |
| **C-P1-02** | Contact workspace still says memberships/wallet “coming soon” while dedicated apps exist | Staff see two truths: `/business/memberships` works; contact drawer does not. | Contact workspace vs `features/memberships` |
| **C-P1-03** | Settings → Templates is `SettingsPlaceholder` | Nav implies templates; runbook for email templates lives under notifications. | `business/settings/templates` |
| **C-P1-04** | Finance catalog (estimates, gift cards, memberships, offers, packages) has **~0 backend specs** | Highest-revenue paths are least tested. | `backend/libs/modules/finance/*` |
| **C-P1-05** | CRM (contacts/leads/pipelines/notes) has almost no service tests | Gold-standard CRUD in AGENTS.md is untested. | `backend/libs/modules/crm/*` |
| **C-P1-06** | Checkout-advanced + custom-fees controllers are **not** `@RequireModule` | A plan without `sales` can still hit those APIs if the user knows the URL. | `finance/checkout-advanced-settings`, `finance/custom-fees` |
| **C-P1-07** | Business integrations / WhatsApp APIs rely on roles, not `settings.integrations.*` | Entitled vs not-entitled businesses can still connect providers via API. | `business-integrations.controller.ts`, `business-whatsapp.controller.ts` |
| **C-P1-08** | Public pricing Stripe checkout accepts client `businessId` | `POST public/pricing/:planGroupId/stripe/checkout-session` can start checkout for another tenant UUID if the caller knows it. | Platform billing Stripe controller |
| **C-P1-09** | Chatbot session APIs keyed only by `sessionId` | A leaked UUID can read/send without `publicKey`. | `public-chatbot.controller.ts` |
| **C-P1-10** | Dual Stripe stacks are easy to confuse in QA | Platform **SaaS billing** ≠ tenant **Connect** charges. Wrong webhook = lost money or leaked payouts. | `platform/billing/stripe` vs `integrations/.../stripe` |
| **C-P1-11** | `InvoiceStatus` includes `OPEN` (Prisma) vs older FE copies that used only DRAFT/SENT/PARTIAL/PAID/OVERDUE/VOID | Checkout invoices vs standard invoices can render unknown badges. | Prisma `InvoiceStatus` vs `frontend/lib/types/api.ts` |
| **C-P1-12** | `main` vs `development` product gap | Shipping `main` would omit social planner, forms, catalog commerce, waitlist, time clock, reports, trial, etc. **Production must be `development` (or a release cut from it).** | Git branches |

### P2 — consistency / polish (track, do not block if accepted)

| ID | Issue | Notes |
|----|--------|-------|
| **C-P2-01** | `/book/[slug]` and `/booking/[slug]` duplicate the same page | Keep both for compatibility; assert canonical redirects. |
| **C-P2-02** | `/business/settings/business-hours` and `/business/settings/data` unmapped in capability route map | Unmapped routes stay visible in dev (`warnUnmappedBusinessRoute`). |
| **C-P2-03** | Appointment `source: EXPRESS` omitted from some dashboard type unions | Dashboard widgets can drop express bookings. |
| **C-P2-04** | FE envelope parser accepts canonical **and** legacy `{ items, meta }` / `success` | Fine for migration; production should freeze one shape. |
| **C-P2-05** | Cursor pagination on some subscription ledgers vs offset on most lists | Do not assume `page/limit` everywhere. |
| **C-P2-06** | No dedicated social “queue” route — posts list + statuses act as queue | Match Figma later; test statuses `DRAFT…CANCELLED`. |
| **C-P2-07** | Automation actions / chatbot RAG / WhatsApp Flows / checkout signature marked stub or “coming soon” | Hide or label in production UI. |
| **C-P2-08** | Deferred reports (`cash_drawer_activity`, `days_off`, `payroll`) registered but rejected | UI must not offer Generate. See `backend/libs/modules/reports/DEFERRED_REPORTS.md`. |
| **C-P2-09** | Form statuses: Prisma `DRAFT/PUBLISHED/ARCHIVED`, FE often lowercase with mapper | Assert mapper round-trip. |
| **C-P2-10** | Spelling: appointment `CANCELLED` (2 L) vs membership/subscription `CANCELED` (1 L) | Label tests must use the domain’s spelling. |
| **C-P2-11** | Realtime: runbook mentions Socket.IO; older/main code used SSE | Confirm production transport (`features/realtime`) against `core/realtime`. |
| **C-P2-12** | Mobile app tree is a placeholder | Out of web production scope; do not promise mobile parity. |

---

## 3. Cross-cutting contract tests

### 3.1 Auth, session, context

| ID | Sev | Layer | Steps | Expect |
|----|-----|-------|-------|--------|
| **AUTH-01** | P0 | E2E | Open `/login` unauthenticated → submit invalid password | Stay on login; no cookies; envelope `error.code` is credentials-class |
| **AUTH-02** | P0 | E2E | Login OWNER of Business A | Redirect to `/business/dashboard` (or `/select-context` if multi-context); httpOnly `access_token` + `refresh_token` |
| **AUTH-03** | P0 | E2E | User with platform + business memberships → `/select-context` → pick platform | `/platform/dashboard`; `/business/*` redirected away |
| **AUTH-04** | P0 | E2E | Switch context to Business A | JWT `context=business`, `businessId=A`; nav is snapshot + capabilities for A |
| **AUTH-05** | P0 | API | Call `/api/backend/contacts` with expired access token | BFF refreshes via `/auth/refresh`; retry succeeds **or** 401 → `/login` |
| **AUTH-06** | P0 | E2E | Logout | Cookies cleared; `/business/dashboard` → `/login` |
| **AUTH-07** | P1 | E2E | Forgot password → email link → `/reset-password` | Password changes; old refresh tokens unusable |
| **AUTH-08** | P1 | E2E | `/accept-invite` with valid token | Membership ACTIVE; can login to that business |
| **AUTH-09** | P1 | API | `POST /auth/register` (no FE) | Document product decision: 404/disabled in prod **or** ship the FE. Do not leave an undocumented open register |
| **AUTH-10** | P1 | API | `POST /auth/verify-email` with bad token | `AppException` domain code; no session created |
| **AUTH-11** | P0 | SEC | MEMBER of A requests `GET /contacts` then repeats with Business B’s id in body/query | Always A’s data; never B |
| **AUTH-12** | P0 | E2E | Suspended / `NOT_ACTIVE` / `UNPAID` / `INCOMPLETE` business | `/business/access-blocked`; APIs `BUSINESS_*` / access reason codes |
| **AUTH-13** | P0 | E2E | `TRIALING` and `PAST_DUE` | Workspace **usable** (grace) unless access resolver says otherwise — assert against `businesses/current/access` |
| **AUTH-14** | P1 | E2E | Trial widget `/widget/trial` → handoff | Creates business + OWNER; lands in app; subscription `TRIALING` |

### 3.2 Envelope, errors, idempotency

| ID | Sev | Layer | Steps | Expect |
|----|-----|-------|-------|--------|
| **API-01** | P0 | API | Any list (`GET contacts?page=1&limit=20`) | `{ data: [...], meta: { requestId, pagination or total/page/limit }, error: null }` **or** documented `{ items, meta }` — pick one and freeze |
| **API-02** | P0 | API | Validation failure (missing required field) | `error.details[]` with `field` + `messages`; FE maps into form errors |
| **API-03** | P0 | API | Delete without `?confirm=true` | Rejected (4xx) |
| **API-04** | P0 | API | Delete with `?confirm=true` | Soft-delete (`deletedAt` set); list no longer returns row |
| **API-05** | P1 | API | Replay mutation with same `Idempotency-Key` | Same result; no duplicate invoice/payment/appointment |
| **API-06** | P1 | API | Redis down in production | Fail closed on idempotency (do not silently skip) |
| **API-07** | P0 | API | `@SkipEnvelope` paths (health, widgets JS, raw webhooks) | FE public clients do **not** run `parseEnvelope` on them |

### 3.3 Capabilities vs staff vs roles

| ID | Sev | Layer | Steps | Expect |
|----|-----|-------|-------|--------|
| **CAP-01** | P0 | E2E | Plan **without** `appointments` module → open `/business/appointments` | `/business/feature-unavailable` (correct **module** key, not hardcoded `payments`) |
| **CAP-02** | P0 | E2E | Plan **with** `appointments.list` but **without** express booking → `/business/settings/express-booking` | Denied (`appointments.express_booking`) |
| **CAP-03** | P0 | E2E | After **C-P0-02** fix: plan with `appointments.list` only → waiting-room / cancel-reschedule / quick-tools | Explicit product rule: either allowed via `appointments.list` **or** gated on a real option key — never on `appointments.access` |
| **CAP-04** | P0 | E2E | MEMBER without `conversations.send` | Can open inbox; send disabled; API `POST …/messages` 403 |
| **CAP-05** | P0 | API | Same as CAP-04 hitting API directly | `FEATURE_NOT_AVAILABLE` / `CAPABILITY_NOT_INCLUDED` / staff-permission 403 — document which |
| **CAP-06** | P1 | E2E | Snapshot nav hides a module the plan still entitles | Capability augment **adds** the item (`augment-snapshot-navigation`) |
| **CAP-07** | P1 | E2E | Snapshot nav includes a route the plan does not entitle | Item hidden / route blocked |
| **CAP-08** | P1 | E2E | OWNER vs MEMBER on Settings → Team / Billing | MEMBER cannot invite or change billing |
| **CAP-09** | P1 | API | Custom-fees + checkout-advanced without `sales` module | After **C-P1-06** fix: 403. Today: likely 200 — fail the case until guarded |

### 3.4 Tenant isolation and public tokens

| ID | Sev | Layer | Steps | Expect |
|----|-----|-------|-------|--------|
| **ISO-01** | P0 | API | As Business A, `GET /invoices/{id-from-B}` | 404, not 403 with B’s payload |
| **ISO-02** | P0 | API | Public booking uses slug only; send another `businessId` in body | Ignored; appointment owned by slug’s business |
| **ISO-03** | P0 | API | Guess invoice public token | 404; no leakage of line items |
| **ISO-04** | P1 | API | `POST public/pricing/:planGroupId/stripe/checkout-session` with Business B’s UUID while “acting” as A | Must not create B’s checkout (**C-P1-08**) |
| **ISO-05** | P1 | API | Chatbot: create session with publicKey A, then `GET messages` with sessionId only from another origin | Require publicKey (or equivalent) after **C-P1-09** |
| **ISO-06** | P0 | API | Webhooks without valid signature (Meta, Stripe, Resend, Twilio) | 4xx; no `WebhookEvent` processed |
| **ISO-07** | P0 | API | Replay webhook with same provider event id | Idempotent; no duplicate messages/payments |

### 3.5 Realtime, jobs, storage

| ID | Sev | Layer | Steps | Expect |
|----|-----|-------|-------|--------|
| **RT-01** | P1 | E2E | Two staff in same business; staff 1 sends inbox message | Staff 2 list/thread updates without full reload |
| **RT-02** | P1 | E2E | Social post publish job completes | Composer/posts list status → `PUBLISHED` or `FAILED` |
| **JOB-01** | P1 | API | `GET /jobs/:id` for QUEUED → COMPLETED | Status enum `QUEUED\|ACTIVE\|COMPLETED\|FAILED`; FE poller stops |
| **JOB-02** | P1 | JOB | Appointment reminder scheduler (hourly) | Reminder enqueued only for upcoming confirmed appts; timezone = business TZ |
| **STO-01** | P1 | E2E | Upload image on social composer / form file field | `FileAsset` row; confirm flow; no raw S3 URL without confirm |
| **STO-02** | P1 | E2E | Social publish to TikTok-class pull-by-URL network | Public media URL uses `R2_PUBLIC_BASE_URL` |

---

## 4. Intended day-in-the-life journeys (run these first)

These are the production “does the business work?” flows. Each journey is one E2E script plus API assertions.

### Journey J1 — New med spa goes live

| Step | UI | Expect |
|------|-----|--------|
| 1 | Platform creates / trial widget signs up Business A | `BusinessStatus.ACTIVE`, subscription `TRIALING` or `ACTIVE` |
| 2 | OWNER logs in, completes profile (`/business/settings/profile`) | Timezone, name, industry saved |
| 3 | Settings → Team: invite ADMIN + MEMBER | Invite email; accept-invite works |
| 4 | Settings → Services: create category + service (duration, price, staff, resources, online booking flag) | Service `ACTIVE`; appears in booking |
| 5 | Settings → Calendars: create staff calendar + weekly availability | `publicSlug` unique; `/book/{slug}` resolves |
| 6 | Settings → Payment account: Stripe Connect onboarding (test) | Integration `CONNECTED`; mode test/live explicit |
| 7 | Settings → Online booking: enable | Public page no longer “unavailable” |
| 8 | Snapshot nav shows Appointments, Contacts, Sales, Inbox | Matches entitled modules |

**Pass:** Client can book; staff see the appointment; no access-blocked.

### Journey J2 — Client books, staff runs the visit, checkout

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J2-01** | P0 | Public `/book/{slug}`: pick service, staff, slot, enter contact | Appointment created `UNCONFIRMED` or `CONFIRMED` per online-booking settings; source `BOOKING_WIDGET` or `PUBLIC_LINK`; contact upserted on Business A |
| **J2-02** | P0 | Double-book same slot | `BOOKING_SLOT_UNAVAILABLE` (or equivalent); no second row |
| **J2-03** | P0 | Staff calendar shows the visit | Status chip matches Prisma: `PENDING_COMPLETION`, `UNCONFIRMED`, `CONFIRMED`, `WAITING`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| **J2-04** | P1 | Waiting room: mark WAITING → IN_SERVICE → COMPLETED | Settings waiting-room rules apply; automated messages respect templates |
| **J2-05** | P0 | Close sale from appointment (`/business/sales` or appointment checkout) | Checkout invoice `InvoiceKind.CHECKOUT`; line items = services; taxes/fees from checkout-advanced + custom-fees |
| **J2-06** | P0 | Collect Stripe (Connect) | Payment `SUCCEEDED`; invoice `PAID` or `PARTIAL`; webhook idempotent |
| **J2-07** | P1 | Deposit required service | Public book takes deposit (`PayableType.BOOKING_DEPOSIT`) before confirm |
| **J2-08** | P1 | Client `/manage/{token}` reschedule/cancel | Honors cancel-reschedule settings; staff calendar updates |
| **J2-09** | P1 | Express booking link `/express/{token}` | Capability `appointments.express_booking`; deposit type enum `ExpressDepositType` |

### Journey J3 — Estimate → invoice → public pay

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J3-01** | P0 | Create estimate DRAFT with contact + lines (service/product) | Number unique per business |
| **J3-02** | P0 | SENT → client public token | **WAIVED FOR LAUNCH (C-P0-01).** SENT is staff-internal only; `/estimate/{token}` shows unavailable, not APPROVE/REJECT. Track post-launch. |
| **J3-03** | P0 | APPROVED → convert to invoice | Estimate `CONVERTED`; invoice DRAFT/SENT with same lines |
| **J3-04** | P0 | Send invoice; open `/invoice/{token}` | Public invoice; pay CTA |
| **J3-05** | P0 | Checkout session / payment intent (Connect) | Webhook marks `PAID` / `PARTIAL`; staff list matches |
| **J3-06** | P1 | Duplicate estimate/invoice | New number; not a clone of public token |
| **J3-07** | P1 | VOID invoice with payment | Blocked or refund path — never silent money mismatch |
| **J3-08** | P1 | Overdue cron | `OVERDUE` when due date passed and unpaid |

### Journey J4 — Catalog commerce (packages, memberships, gift cards)

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J4-01** | P0 | Create product + variant + inventory | Sellable on invoice/sale |
| **J4-02** | P0 | Sell product; inventory decrements | Adjustment type recorded |
| **J4-03** | P0 | Package template → sell client package | `ClientPackage` on contact; redeem on a later sale |
| **J4-04** | P0 | Public `/packages/{slug}` purchase | Tenant from slug; payment Connect |
| **J4-05** | P0 | Membership plan → client membership | Status `SCHEDULED/ACTIVE/PAST_DUE/UNPAID/PAUSED/CANCELED` |
| **J4-06** | P0 | Public `/memberships/{slug}` | Same isolation as packages |
| **J4-07** | P0 | Issue gift card; redeem on sale | Status `ACTIVE` → `DEPLETED`; `VOIDED` not redeemable |
| **J4-08** | P0 | Public `/gift-cards/{slug}` | Purchase issues card on correct business |
| **J4-09** | P1 | Offer code on public booking | `offers-public` by slug; invalid/expired rejected |
| **J4-10** | P1 | Custom fee + checkout-advanced flags on sale | Fee calculation **only** inside checkout/invoice pipeline (runbook pitfall) |

### Journey J5 — Inbox (SMS / WhatsApp / email / webchat)

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J5-01** | P0 | Inbound Twilio SMS webhook | Conversation `OPEN`, channel `SMS`, contact linked; worker not request-thread |
| **J5-02** | P0 | Inbound WhatsApp (Meta) | 24h session window enforced on free-form send |
| **J5-03** | P0 | Staff reply | Outbound job; message status `PENDING→SENT→DELIVERED/READ/FAILED` (FE must show `PENDING`) |
| **J5-04** | P1 | WhatsApp template send outside window | Uses approved template (`WhatsAppMessageTemplate`); unapproved rejected |
| **J5-05** | P0 | Assign / close / reopen / spam | Status `OPEN/PENDING/CLOSED/SPAM`; realtime to other staff |
| **J5-06** | P1 | Canned responses + internal notes | Notes not sent to the client |
| **J5-07** | P1 | Start email conversation | Resend outbound; inbound webhook threads by reply-to |
| **J5-08** | P1 | Webchat via chatbot public widget | Channel `WEBCHAT`; optional AI_AGENT sender type |
| **J5-09** | P0 | Isolation: Business B cannot list A’s threads | Empty / 404 |

### Journey J6 — Forms + paid form

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J6-01** | P0 | Builder: add registry field types, publish | Form `PUBLISHED`; public widget loads by `publicKey` |
| **J6-02** | P0 | Public submit | Submission stored; **no client `businessId` trusted**; optional contact/lead created |
| **J6-03** | P1 | File field | Storage confirm; virus/size limits |
| **J6-04** | P0 | Payment field with Stripe Connect | `FormPaymentAttempt` + `PayableType.FORM_PAYMENT`; unpaid form not “complete” |
| **J6-05** | P1 | Unpublished / archived form publicKey | 404 / disabled |
| **J6-06** | P1 | Field type added only on FE | Must fail until BE registry updated (runbook: do not bypass registry) |

### Journey J7 — Social planner

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J7-01** | P0 | Connect Instagram/Facebook/LinkedIn via existing OAuth popup (`/api/oauth/.../start`) | `BusinessIntegration` `CONNECTED`; no second OAuth path |
| **J7-02** | P0 | Compose post + media + destinations → save DRAFT | `SocialPost` + targets + media |
| **J7-03** | P0 | Schedule | Status `SCHEDULED`; calendar shows it |
| **J7-04** | P0 | Worker publishes | `PUBLISHING` → `PUBLISHED` or `PARTIAL`/`FAILED` per target (`SocialPostTargetStatus`) |
| **J7-05** | P1 | Cancel scheduled | `CANCELLED`; worker does not publish |
| **J7-06** | P1 | Comments inbox (supported networks) | Ingest worker; TikTok explicitly unsupported in UI |
| **J7-07** | P1 | Missing `social_planner` module | Routes `/business/social-planner/**` blocked |

### Journey J8 — Automations + chatbots

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J8-01** | P1 | Workflow: appointment CONFIRMED → send SMS | Enqueued; respects notification prefs + SMS suppression |
| **J8-02** | P1 | Stub actions in registry | UI does not offer them as live, or they no-op with a clear error |
| **J8-03** | P0 | Chatbot DRAFT → ACTIVE → public `/chat/{publicKey}` | Session + messages; cannot call privileged business APIs |
| **J8-04** | P1 | Disable/archive chatbot | Public widget unavailable |

### Journey J9 — Platform operator

| ID | Sev | Steps | Expect |
|----|-----|-------|--------|
| **J9-01** | P0 | Create plan group + published tier + capabilities | Businesses on that tier receive `PLAN_TIER` grants |
| **J9-02** | P0 | Run entitlement campaign matrix | **Follow `docs/platform-operations-testing.md` cases 1–10 exactly** |
| **J9-03** | P0 | Snapshot publish + apply to a business | Validation errors block apply; provision is confirm-gated |
| **J9-04** | P0 | Platform Stripe checkout vs Connect | Money lands on **platform** customer vs **connected account** respectively |
| **J9-05** | P1 | Audit log after contact create/delete | `AuditService.log` row with actor + business |
| **J9-06** | P1 | Data import job | Observable via jobs API; failed rows reported; no cross-tenant import |

---

## 5. Domain test packs (aligned to `.approach`)

Each subsection maps 1:1 to a runbook. Use these as the regression suite after J1–J9.

### 5.1 CRM — `.approach/features/crm/contacts-leads-pipelines.md`

**Statuses:** Lead per product stages; Service `ACTIVE/ARCHIVED`; Work items are operations (see 5.4).

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **CRM-01** | P0 | E2E | Create contact (name, email, phone, tags) → appears in list search |
| **CRM-02** | P0 | API | Duplicate email/phone in same business → domain error; allowed across tenants |
| **CRM-03** | P0 | E2E | Soft-delete contact with `?confirm=true` → gone from list; appointments/invoices still historically linked |
| **CRM-04** | P0 | E2E | Pipeline create + stages reorder; cannot delete stage/pipeline with leads |
| **CRM-05** | P0 | E2E | Lead from contact; one lead per contact; move stage |
| **CRM-06** | P1 | E2E | Notes on contact/lead; MEMBER can create if permitted |
| **CRM-07** | P0 | E2E | Service catalog: category, duration, price, staff, resources, online-booking tab |
| **CRM-08** | P1 | E2E | Platform industries CRUD; business sees only `active` industries |
| **CRM-09** | P0 | SEC | All list queries include `deletedAt: null` and `businessId` |
| **CRM-10** | P1 | API | Audit events `contact.created/updated/deleted` |

### 5.2 Appointments & calendars — `operations/appointments-calendars.md`

**AppointmentStatus:** `PENDING_COMPLETION`, `UNCONFIRMED`, `CONFIRMED`, `WAITING`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`  
**Source:** `INTERNAL`, `BOOKING_WIDGET`, `PUBLIC_LINK`, `GOOGLE_SYNC`, `IMPORTED`, `EXPRESS`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **APT-01** | P0 | E2E | Internal book from `/business/appointments` drawer |
| **APT-02** | P0 | E2E | Availability + exceptions: closed day yields no slots |
| **APT-03** | P0 | E2E | Multi-service lines (`AppointmentServiceLine`) duration sums |
| **APT-04** | P1 | E2E | Resource required service blocks if resource booked |
| **APT-05** | P1 | E2E | Automated messages config send on confirm/cancel (email/SMS jobs) |
| **APT-06** | P1 | E2E | Google Calendar sync: create/update/delete mirrors; OAuth from integrations |
| **APT-07** | P1 | E2E | Calendar display preferences persist (feature-specific chrome is OK per design-system) |
| **APT-08** | P1 | E2E | Scheduling options (buffers, min notice) enforced on public + internal |
| **APT-09** | P2 | E2E | Dashboard widgets include `EXPRESS` source appointments |

### 5.3 Public / express / online booking — `operations/public-booking.md`

Existing smoke: `frontend/e2e/public-booking.spec.ts` (extend; do not replace).

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **BOOK-01** | P0 | E2E | Disabled/unknown slug → unavailable copy (already partially automated) |
| **BOOK-02** | P0 | E2E | `/calendar/{slug}` redirects to `/book/{slug}` |
| **BOOK-03** | P0 | E2E | `/booking/{slug}` alias works |
| **BOOK-04** | P0 | E2E | Embed `/embed/booking/{slug}` uses shared components; `FRONTEND_URL` / `NEXT_PUBLIC_APP_URL` for CORS |
| **BOOK-05** | P0 | E2E | Happy-path book (J2-01) |
| **BOOK-06** | P0 | API | Slot race: two parallel POSTs → one success |
| **BOOK-07** | P1 | E2E | Waitlist when no slots (`BookingWaitlistStatus`: WAITING → MATCHED → BOOKED / DISMISSED / EXPIRED / CANCELLED) |
| **BOOK-08** | P1 | E2E | Business hours via `online-booking-settings/business-hours` (not a standalone Nest module) |
| **BOOK-09** | P1 | E2E | Online booking settings toggle hides public book |
| **BOOK-10** | P1 | E2E | Quick tools / express admin |

### 5.4 Ops extras — `operations/tasks-work-items-ops.md`

**TaskStatus:** `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`  
**WorkItemStatus:** `DRAFT`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **OPS-01** | P1 | E2E | Task complete/reopen |
| **OPS-02** | P1 | E2E | Work item requires contact; platform `/platform/work-items` for ops admins |
| **OPS-03** | P1 | E2E | Time clock kiosk (`time_clock.kiosk`) vs time cards (`time_clock.cards.manage`) |
| **OPS-04** | P1 | E2E | Resources + resource groups used by services |
| **OPS-05** | P1 | E2E | Waitlist panel inside appointments (no standalone `/business/waitlist` is OK if documented) |
| **OPS-06** | P2 | E2E | Unmapped settings: business-hours, data-io |

### 5.5 Finance — invoices/estimates — `finance/invoices-estimates.md`

**EstimateStatus:** `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `CONVERTED`  
**InvoiceStatus:** `DRAFT`, `SENT`, `PARTIAL`, `PAID`, `OVERDUE`, `VOID`, `OPEN`  
There is **no** `finance/sales` Nest module — sales UI = checkout APIs under invoices.

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **FIN-01** | P0 | E2E | Invoice CRUD + status transitions (illegal jumps rejected) |
| **FIN-02** | P0 | E2E | Sales list + drawer + collect (see `feature-docs/Application/Sales/**`) |
| **FIN-03** | P0 | E2E | Public invoice pay (J3) |
| **FIN-04** | P0 | E2E | Public estimate (blocked by C-P0-01 until implemented) |
| **FIN-05** | P1 | API | Invoice numbers unique per business |
| **FIN-06** | P1 | E2E | Partial payment → invoice `PARTIAL` + payment status `PARTIALLY_PAID` / payment row `SUCCEEDED` |
| **FIN-07** | P1 | E2E | Refund → invoice/payment reconciliation; Connect refund webhook |

### 5.6 Payments & Stripe — `finance/payments-and-stripe.md`

**PaymentStatus:** `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUNDED`  
**PayableType:** `INVOICE`, `BOOKING_DEPOSIT`, `FORM_PAYMENT`, `PRODUCT_ORDER`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **PAY-01** | P0 | E2E | Connect onboarding (test mode) |
| **PAY-02** | P0 | E2E | Toggle test/live — charges use matching keys (`stripe-mode.util`) |
| **PAY-03** | P0 | JOB | Stripe Connect webhook signature + idempotency |
| **PAY-04** | P0 | E2E | Collect on invoice, booking deposit, form (payable registry) |
| **PAY-05** | P0 | SEC | Connect charge never hits platform Stripe account (J9-04) |
| **PAY-06** | P1 | E2E | Refund permissions `payments.refund` |
| **PAY-07** | P1 | E2E | Disconnected / `ERROR` / `EXPIRED` integration blocks collect with a clear error |
| **PAY-08** | P1 | API | Payment-account settings require real capability keys (not `payments.access`) |

### 5.7 Catalog — `finance/catalog-commerce.md`

Covered by J4. Add:

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **CAT-01** | P1 | E2E | Product images via storage |
| **CAT-02** | P1 | E2E | Bundle products |
| **CAT-03** | P1 | E2E | Membership settings (auto-renew, grace) vs client membership statuses |
| **CAT-04** | P2 | E2E | Contact drawer “coming soon” vs real memberships app (C-P1-02) |

### 5.8 Conversations — `communications/conversations.md`

See J5. Add:

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **INB-01** | P0 | API | Cursor pagination on messages (`before/after`, `hasMore`) |
| **INB-02** | P1 | E2E | `conversations.view_all` vs only assigned |
| **INB-03** | P1 | E2E | Platform `/platform/conversations` (if enabled) does not leak tenant message bodies to the wrong operator role |
| **INB-04** | P0 | JOB | Do not add HTTP CRUD under `messages/` — outbound stays job-driven |

### 5.9 Email / SMS / notifications — `communications/email-sms-notifications.md`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **NTF-01** | P1 | E2E | Settings → Notifications: preferences persist |
| **NTF-02** | P1 | E2E | Email template preview/reset; variables render |
| **NTF-03** | P0 | JOB | Bulk email/SMS **never** sent in the API request thread |
| **NTF-04** | P0 | API | Twilio/Resend webhook signature |
| **NTF-05** | P1 | API | `PlatformSmsSuppression` honored |
| **NTF-06** | P2 | E2E | Templates placeholder page vs real email templates (C-P1-03) |

### 5.10 Chatbots / automations / webhooks — `communications/chatbots-automations-webhooks.md`

See J8. Add webhook workers:

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **WH-01** | P0 | JOB | Meta webhook → worker (not API thread) |
| **WH-02** | P0 | JOB | Stripe webhook → correct **Connect vs platform** processor |
| **WH-03** | P2 | E2E | Chatbot RAG/handoff stubs hidden |

### 5.11 Social planner — `communications/social-planner.md`

See J7. Statuss: `DRAFT`, `SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `PARTIAL`, `FAILED`, `CANCELLED`.

### 5.12 Forms — `communications/forms.md`

See J6.

### 5.13 Integrations — `integrations/oauth-integrations.md`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **INT-01** | P0 | E2E | OAuth popup uses `oauth-app-origin.ts` + `NEXT_PUBLIC_APP_URL` (not raw `request.url` behind Docker) |
| **INT-02** | P0 | E2E | Per-provider connect (Google, Meta, LinkedIn, Stripe, WhatsApp, X/Pinterest/TikTok if enabled) |
| **INT-03** | P0 | E2E | Disconnect → resources unusable; social publish fails cleanly |
| **INT-04** | P1 | E2E | `/oauth/callback` closes popup and refreshes grid |
| **INT-05** | P1 | SEC | Tokens encrypted (`INTEGRATION_ENCRYPTION_KEY`); never logged |
| **INT-06** | P1 | API | Business integrations APIs gated by `settings.integrations` after C-P1-07 |

### 5.14 Platform auth/capabilities — `platform/auth-business-capabilities.md`

See AUTH-* and CAP-*. Add:

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **PLT-01** | P0 | E2E | Platform users CRUD; cannot delete last SUPER_ADMIN |
| **PLT-02** | P0 | E2E | Impersonation / open-business-as (if shipped) is audited and reversible |
| **PLT-03** | P0 | API | Client-supplied capability flags ignored; server resolves grants |
| **PLT-04** | P1 | E2E | Add-ons attach/detach; grandfathering per operations doc |

### 5.15 Billing / snapshots / data-io / trial / jobs / audit — `platform/billing-snapshots-admin.md`

See J9. Add:

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **BIL-01** | P0 | E2E | Business billing portal (platform Stripe customer) |
| **BIL-02** | P0 | E2E | Failed SaaS payment → `PAST_DUE` then `UNPAID` access cut-off |
| **SNP-01** | P0 | E2E | Snapshot validation blocks apply on schema errors |
| **DIO-01** | P1 | E2E | Export contacts CSV; import with mapping; dry-run |
| **AUD-01** | P1 | E2E | `/platform/audit-logs` filters by business/actor |

### 5.16 Reports / storage / shell — `cross/reports-storage-realtime-shell.md`

| ID | Sev | Layer | Case |
|----|-----|-------|------|
| **RPT-01** | P0 | E2E | Generate a **non-deferred** report (PDF/Excel) with `reports` module |
| **RPT-02** | P0 | E2E | Deferred keys (`cash_drawer_activity`, `days_off`, `payroll`) cannot generate |
| **RPT-03** | P1 | API | `requiredModuleKey` honored |
| **SET-01** | P1 | E2E | Appearance = local theme only (OK); do not claim server persistence |
| **SET-02** | P1 | E2E | WhatsApp settings templates match Meta-approved list |
| **SET-03** | P2 | E2E | Team staff-permission toggles match BE registry (56 keys) |

---

## 6. Public surface matrix (production smoke)

Run this table against staging with real slugs/tokens (not production customer data).

| Surface | Route(s) | Backend | Smoke |
|---------|----------|---------|-------|
| Booking | `/book/[slug]`, `/booking/[slug]`, `/calendar/[slug]`, embeds | `public/booking` | BOOK-* |
| Manage appointment | `/manage/[token]` | `public/appointments` | J2-08 |
| Express | `/express/[token]` | `public/express` | J2-09 |
| Invoice pay | `/invoice/[token]`, `/pay/invoice/[token]`, `/payment/[token]` | `public/invoices` | J3 |
| Estimate | `/estimate/[token]` | **missing (waived for launch)** | C-P0-01 unavailable page; no public API |
| Forms widget | `/widget/form/[publicKey]` | `public/forms` | J6 |
| Chatbot | `/chat/[publicKey]`, `/widget/chat*`, `/widget/chatbot*` | `public/chatbots` | J8 |
| Packages | `/packages/[slug]/…` | `public/packages` | J4 |
| Gift cards | `/gift-cards/[slug]` | `public/gift-cards` | J4 |
| Memberships | `/memberships/[slug]/…` | `public/memberships` | J4 |
| Offers | (booking apply) | `public/offers` | J4-09 |
| Trial | `/widget/trial` | `public/trial` | AUTH-14 |
| Pricing embed | `/public/pricing`, `/embed/pricing*` | plan-groups + platform Stripe | ISO-04 |
| Health | API `/health` | skip envelope | 200 with Redis/DB |

---

## 7. State machines (assert illegal transitions)

Use API tests: attempt each illegal jump, expect `AppException`.

### Appointments

Legal happy path: `UNCONFIRMED → CONFIRMED → WAITING → IN_SERVICE → COMPLETED`  
Also: `CONFIRMED → CANCELLED`, `CONFIRMED → NO_SHOW`, `PENDING_COMPLETION → …` per product rules.  
Illegal example: `COMPLETED → IN_SERVICE`, `CANCELLED → CONFIRMED` without a dedicated reopen.

### Estimates

`DRAFT → SENT → APPROVED|REJECTED|EXPIRED → CONVERTED` (convert only from APPROVED or documented SENT).  
Illegal: `CONVERTED → DRAFT`, `REJECTED → CONVERTED`.

### Invoices

`DRAFT → SENT → PARTIAL → PAID`; `SENT → OVERDUE`; `* → VOID` with payment rules.  
`OPEN` (checkout) must be labeled in UI.

### Social posts

`DRAFT → SCHEDULED → PUBLISHING → PUBLISHED|PARTIAL|FAILED`; `SCHEDULED → CANCELLED`.  
Illegal: `PUBLISHED → DRAFT`.

### Gift cards / memberships / waitlist

See enums in Section 5. Assert redeem/void and pause/cancel.

---

## 8. Automation coverage vs what to add

### What exists today (`development`)

| Layer | Approx. count | Strong areas | Weak / empty |
|-------|---------------|--------------|--------------|
| Backend Jest `*.spec.ts` | ~231 | reports providers, integrations, conversations, automations, appointments, social-planner, platform capabilities | **estimates, gift-cards, memberships, offers, packages, leads, notes, pipelines, tasks, resources, Google calendar sync, many platform controllers** |
| Frontend Vitest | ~66 | envelope, snapshot nav, some appointments/forms/conversations | Almost no page/form E2E-level component tests |
| Playwright | **1 file** | unavailable booking slug | Everything else in this document |

### Minimum automation to add before production

**Playwright (frontend/e2e)** — one spec per journey:

1. `auth.spec.ts` — AUTH-01, 02, 04, 06, 12  
2. `public-booking.spec.ts` — extend with BOOK-05 (needs a seeded slug)  
3. `invoice-public-pay.spec.ts` — J3-04/05 (Stripe test)  
4. `sales-checkout.spec.ts` — J2-05/06  
5. `inbox-sms.spec.ts` — J5-01/03 (Twilio test credentials or recorded fixtures)  
6. `forms-public.spec.ts` — J6-01/02  
7. `capability-gating.spec.ts` — CAP-01, CAP-02  
8. `tenant-isolation.spec.ts` — ISO-01 (API via authenticated storageState)

**Backend Jest** — service tests first:

1. Estimates status machine + convert  
2. Payments payable registry (invoice, deposit, form)  
3. Gift card redeem/void  
4. Membership status + public slug resolver  
5. Contacts repository `businessId` + `deletedAt`  
6. Public booking slot uniqueness  
7. Public pricing checkout **rejects** foreign `businessId`  
8. Chatbot session authorization

**Contract**

```bash
npm run openapi:export --prefix backend
npm run codegen --workspace=@business-automation/api-contract
```

Fail CI if `packages/api-contract` is still a placeholder.

### Commands (from `AGENTS.md`)

```bash
# Backend
npm test --prefix backend
npm test --prefix backend -- --testPathPattern=appointment
npm test --prefix backend -- --testPathPattern=invoice
npm test --prefix backend -- --testPathPattern=social-planner
npm test --prefix backend -- --testPathPattern=capability
npm test --prefix backend -- operations-campaign.service.spec

# Frontend
npm test --prefix frontend
npm run test:e2e --prefix frontend -- public-booking

# Redis required for queues / realtime / idempotency
npm run redis:up
```

---

## 9. Suggested production test order

1. **Branch/cut:** confirm the release is from `development` (C-P1-12), not `main`.  
2. **Config:** Redis required, envelope shape, Stripe test vs live, `NEXT_PUBLIC_APP_URL`, `R2_PUBLIC_BASE_URL`, encryption keys.  
3. **P0 consistency:** C-P0-01 … C-P0-04.  
4. **J1** provision a tenant.  
5. **J2** book + checkout (money path).  
6. **J3** invoice pay; **waive or fix** public estimate.  
7. **CAP + ISO** packs (wrong entitlements and wrong tenant = launch blockers).  
8. **J5 inbox** in a staging Meta/Twilio app.  
9. **J7 social** one network.  
10. **J9** + `docs/platform-operations-testing.md`.  
11. **Load/smoke public widgets** (booking, invoice, form, chatbot) from an incognito browser.  
12. **Scheduler:** reminder + overdue invoice on a clock-shifted staging DB.

---

## 10. Traceability (runbook → cases)

| Runbook | Primary cases |
|---------|----------------|
| `crm/contacts-leads-pipelines.md` | CRM-*, J1 |
| `operations/appointments-calendars.md` | APT-*, J2 |
| `operations/public-booking.md` | BOOK-*, J2 |
| `operations/tasks-work-items-ops.md` | OPS-* |
| `finance/invoices-estimates.md` | FIN-*, J3 |
| `finance/payments-and-stripe.md` | PAY-*, J2/J3 |
| `finance/catalog-commerce.md` | CAT-*, J4 |
| `communications/conversations.md` | INB-*, J5 |
| `communications/email-sms-notifications.md` | NTF-* |
| `communications/chatbots-automations-webhooks.md` | WH-*, J8 |
| `communications/social-planner.md` | J7 |
| `communications/forms.md` | J6 |
| `integrations/oauth-integrations.md` | INT-* |
| `platform/auth-business-capabilities.md` | AUTH-*, CAP-*, PLT-* |
| `platform/billing-snapshots-admin.md` | BIL-*, SNP-*, J9, `docs/platform-operations-testing.md` |
| `cross/reports-storage-realtime-shell.md` | RPT-*, RT-*, STO-* |

---

## 11. Sign-off checklist

- [ ] Release artifact is cut from `development` (or a frozen release branch), not stale `main`  
- [ ] OpenAPI exported and `api-contract` generated  
- [x] C-P0-01 public estimates: **waived for launch** — public page unavailable; `estimate.publicUrl` stubbed; no staff/email CTAs send clients to `/estimate/[token]`; tracked post-launch  
- [ ] C-P0-02 capability keys aligned to registry (not staff keys)  
- [ ] Stripe Connect vs platform billing webhooks verified in test mode  
- [ ] Tenant isolation ISO-01…07 passed on staging  
- [ ] Public booking + invoice pay + form submit passed incognito  
- [ ] Entitlement campaign matrix (`docs/platform-operations-testing.md`) passed  
- [ ] Playwright journeys 1–8 (Section 8) green in CI  
- [ ] Deferred reports cannot be generated  
- [ ] Stub/coming-soon surfaces labeled or removed  
- [ ] Redis, storage, and worker processes are in the production topology (API + worker + scheduler)

---

*Generated from repository runbooks (`.approach`, `AGENTS.md`, `.cursor/rules`) plus a frontend/backend consistency pass on the `development` tree. Update this file when a P0/P1 issue is closed or a runbook’s status machine changes.*
