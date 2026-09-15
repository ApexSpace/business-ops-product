# Privacy Policy — PandaCue

**Effective date:** August 7, 2026  
**Last updated:** August 7, 2026  

**Product:** PandaCue (the “Service,” “Platform,” “we,” “us,” or “our”)  
**Operator / data controller (platform account & infrastructure data):** PandaCue (“Company”)  

**Contact for privacy requests:** support@codesoltech.com  

**Service websites (examples):** https://dev.pandacue.com, https://app.codesoltech.com, related API hosts (e.g. https://dev-api.pandacue.com), and any successor domains we operate for PandaCue.

> **Important notice.** This document is a product-aligned draft based on how PandaCue works today. It is **not legal advice**. Have counsel review it for your jurisdiction (including US state privacy laws, GDPR/UK GDPR if you serve those users, TCPA/CASL for SMS, and platform-specific rules for Meta, Google, TikTok, etc.). Replace bracketed placeholders such as `[LEGAL ENTITY FULL NAME]`, `[REGISTERED ADDRESS]`, and `[GOVERNING LAW / VENUE]` before publishing.

---

## 1. Scope and roles

### 1.1 What this Policy covers

This Privacy Policy describes how we collect, use, disclose, store, and protect information when you:

- create or use a **PandaCue account** (platform staff or business staff);
- use business features (CRM, booking, messaging, social publishing, finance, forms, automations, and related tools);
- visit **public** surfaces we host for a business (online booking, invoices/estimates/payment links, forms, chat/chatbot widgets, gift cards, packages, memberships, embeds);
- connect **third-party integrations** (Google, Meta, LinkedIn, TikTok, Pinterest, X, Stripe, Twilio-related messaging, email providers, storage, and similar);
- communicate with us about support, billing, or trial signup.

### 1.2 Controller vs. processor (multi-tenant SaaS)

PandaCue is a **multi-tenant business operations platform**. Each customer business (“**Customer**,” “**Business**,” “**Tenant**”) uses the Service to manage **its own clients, patients, leads, and visitors**.

| Data type | Typical role |
|-----------|----------------|
| Your staff account data, authentication, platform billing, product analytics we generate about account use, infrastructure logs, and our own marketing/support communications | PandaCue acts as an independent **controller** (or equivalent). |
| Contacts, leads, appointments, messages, form submissions, invoices issued to *your* end customers, social posts you publish, files you upload for *your* business, chatbot transcripts of *your* website visitors, etc. | The **Customer Business is the controller** of that content. We process it as a **processor / service provider** on the Business’s instructions to provide the Service. |

If you are an **end customer** of a Business (you booked an appointment, filled a form, paid an invoice, or chatted on a Business website), that Business’s own privacy notice applies to how **they** use your information. This Policy explains how **we** process that information on their behalf and what choices may exist through the Business.

### 1.3 Who this Policy does **not** fully cover

- Third-party websites, apps, or services linked from the Service (Google, Meta, TikTok, Stripe Customer Portal, etc.) have their own policies.
- Content published by a Business to social networks is also subject to those networks’ terms and privacy rules.

---

## 2. Information we collect

### 2.1 Account and authentication information

When you register, are invited, or log in, we may collect:

- name, email address, phone number (including E.164 format where used);
- password (stored as a one-way hash; we do not store plaintext passwords);
- email verification status and related tokens;
- password reset tokens (hashed) and related security metadata;
- business membership role (`OWNER`, `ADMIN`, `MEMBER`) and status;
- platform roles for PandaCue staff (`SUPER_ADMIN`, `PLATFORM_ADMIN`, `SUPPORT`) where applicable;
- staff profile details used for operations (e.g. gender where configured, service-provider flags, work schedules, calendars, time-clock **PIN** stored hashed);
- fine-grained **staff permissions** and notification preferences;
- invite tokens and acceptance metadata;
- last login and session-related security data;
- authentication **context** (platform vs. business) when you switch workspaces.

**Trial / signup:** We may collect phone number for **OTP verification via SMS**, then email, password, and business profile details to complete trial signup.

### 2.2 Business profile and settings

For each Business we may store:

- business name, industry/snapshot branding, website, timezone, address and contact fields;
- lifecycle/status and capability/plan entitlements;
- financial/invoice settings (e.g. legal business name, tax identifiers where provided);
- online booking, calendar, notification, automation, and integration settings;
- branding / product display name overrides (e.g. PandaCue or industry hub names).

### 2.3 CRM and relationship data (Customer Content)

Businesses may enter or import:

- **Contacts / clients:** names, company, email, phone, address, timezone, avatar, notes, tags, source, metadata, block/suppression flags;
- **Leads:** pipeline/stage, value, assignment, notes;
- **Notes** and related CRM records;
- services, industries, pipelines, and similar configuration.

Staff permissions may limit which contact fields other staff can see (e.g. hiding last names or contact details).

### 2.4 Scheduling, booking, and operations

We process:

- appointments (times, staff, status, source, related services/resources);
- calendars, availability, work schedules, waitlists, tasks/work items;
- time cards / time clock data;
- resources and related operational records;
- **cancellation / booking policy acceptances**, which may include **IP address** and **user agent** at the time of acceptance;
- express booking and public booking submissions (name, contact details, requested time, notes, and related fields configured by the Business).

### 2.5 Finance and payments

Depending on features enabled:

- estimates, invoices, payments, products/inventory, gift cards, packages, memberships, offers/discounts;
- contact wallets / saved payment method references;
- Stripe customer IDs and Connect account identifiers;
- platform subscription, plan, add-on, and billing event records;
- amounts, currencies, statuses, and related metadata.

**Card numbers** are handled by **Stripe**. We do not intend to store full payment card PANs on our servers.

### 2.6 Communications content

We may process:

- conversations and messages across channels such as **Email, SMS, WhatsApp, Facebook, Instagram, LinkedIn, web chat**, and other configured channels — including message bodies, attachments metadata, external message IDs, and participant identifiers;
- email templates and outbound/inbound email content (including via our email provider and shared sending/receiving domains such as notification domains we operate);
- SMS content and delivery metadata; **opt-out / suppression** records (e.g. STOP);
- WhatsApp template and messaging content where Meta WhatsApp products are connected;
- notification preferences for appointment reminders and similar alerts;
- **automation** runs that may send messages or update records based on Business configuration.

### 2.7 Forms, chatbots, and widgets

Public and embedded surfaces may collect:

- form field answers stored as structured/JSON submissions configured by the Business;
- chatbot/webchat sessions, including visitor identifiers, name/email/phone if provided, page URL, referrer, user agent, and **hashed or truncated IP** where implemented;
- consent acknowledgements shown in chatbot UI (e.g. privacy notice acceptance);
- gift card, package, membership, and offer interactions on public catalog pages.

### 2.8 Social Planner and connected social accounts

When a Business connects social providers and publishes content, we may process:

- OAuth tokens and account/resource identifiers (encrypted at rest with our integration encryption key);
- selected pages, channels, boards, or creator accounts;
- post captions, media files, scheduled times, destination settings (e.g. TikTok privacy level, YouTube privacy status, **Made for Kids** designation, categories);
- publish status, platform-returned IDs, engagement metrics, and comments/replies where the product syncs them;
- creator info needed for publishing rules (e.g. TikTok creator privacy options).

Connected providers may include, as enabled: **Google (including YouTube, Google Calendar, Google Business Profile / lead-related products where configured), Meta (Facebook, Instagram, WhatsApp), LinkedIn, TikTok, Pinterest, X (Twitter), and Stripe Connect**.

### 2.9 Files and media

Uploaded files (avatars, attachments, social media assets, etc.) may include file name, MIME type, size, category, storage object key, visibility, uploader, and content of the file itself, stored in object storage we operate or contract (e.g. Cloudflare R2 / S3-compatible storage).

### 2.10 Audit, security, and diagnostics

We maintain:

- **audit logs** of significant actions (actor, business, action, entity type/id, metadata);
- application and access logs (IP, timestamps, request paths, status codes, approximate location derived from IP where our hosting provides it);
- job/queue telemetry and webhook event records (see retention);
- optional error-monitoring tools if enabled in a given environment.

### 2.11 Cookies, local storage, and similar technologies

We use:

**Strictly necessary / authentication**

- HTTP-only cookies for **access** and **refresh** tokens;
- a readable cookie for **auth context** (platform vs. business workspace selection);
- server-side session/BFF routes that attach credentials to API calls.

**Preferences**

- UI state such as sidebar open/closed cookie.

**Local / session storage (browser)**

- form drafts;
- chatbot visitor/session IDs for embedded widgets;
- OAuth popup result keys;
- other UX caches (e.g. snapshot context).

**Realtime**

- Server-Sent Events and/or WebSockets (when enabled) for near-real-time business events (inbox, payments, etc.), authenticated for logged-in users.

We do **not** currently wire third-party advertising pixels or consumer marketing analytics SDKs in the core app codebase. In-product “analytics” generally means **business reports** and **social engagement metrics** for the Customer’s own use.

### 2.12 Information from third parties

We receive data from:

- OAuth providers (profile/page identifiers, tokens, scopes granted);
- Stripe (payment and subscription events via webhooks);
- Meta, Twilio, Resend, and similar (delivery, inbound messages, webhook payloads);
- Google Calendar sync and other connected APIs;
- hosting, DNS, CDN, and email infrastructure providers.

---

## 3. How we use information

We use information to:

1. **Provide and operate the Service** — accounts, multi-tenant isolation by business, CRM, booking, messaging, social publishing, finance, forms, automations, notifications, and admin tools.
2. **Authenticate and secure** — login, refresh tokens, invite/verify flows, PIN time clock, rate limiting, fraud/abuse prevention, and audit trails.
3. **Process payments** — platform subscriptions and Customer payment collection via Stripe / Stripe Connect.
4. **Send transactional communications** — security emails, invitations, booking confirmations/reminders (email/SMS as configured), system notices.
5. **Enable integrations** you connect — exchanging the minimum data needed with each provider under your authorization.
6. **Improve reliability** — debugging, queues, retention cleanup of ephemeral webhook/job records, capacity planning.
7. **Support and compliance** — respond to requests, enforce Terms, comply with law, and protect rights and safety.
8. **Product development** — aggregated or de-identified insights about feature usage where permitted.

We do **not** sell personal information as “sale” is commonly defined under US state privacy laws for monetary exchange of consumer lists. We also do not use Customer Content to train public foundation models unless we expressly disclose a separate AI feature and obtain required rights (see AI section).

---

## 4. Legal bases (EEA/UK and similar)

Where GDPR/UK GDPR applies, we rely on:

- **Contract** — to provide the Service to account holders;
- **Legitimate interests** — security, product improvement, multi-tenant integrity, support (balanced against your rights);
- **Consent** — where required (e.g. certain cookies, marketing SMS/email if offered, optional chatbot notices, certain OAuth scopes);
- **Legal obligation** — tax, accounting, lawful requests;
- **Processor instructions** — for Customer Content, we process under the Business’s documented instructions and our Terms / DPA if executed.

---

## 5. How we share information

We share information with:

### 5.1 Service providers / subprocessors (infrastructure)

Including providers used for:

| Category | Examples used or contemplated by the product |
|----------|-----------------------------------------------|
| Database | PostgreSQL hosting |
| Cache / queues / realtime | Redis, BullMQ workers |
| Object storage | Cloudflare R2 or S3-compatible storage |
| Email delivery & inbound | Resend (and related DNS/domains such as notify.codesoltech.com) |
| SMS | Twilio (platform and/or Business numbers; trial OTP) |
| Payments | Stripe (platform billing and Connect) |
| Error monitoring | Tools such as Sentry **if** enabled in that environment |
| Hosting / CDN / networking | Cloud hosting providers for app and API |

### 5.2 Integration providers you connect

When a Business connects an integration, relevant data is shared with that provider as needed to perform the requested action (e.g. posting a video to TikTok, syncing a Google Calendar event, sending a WhatsApp template, charging via Stripe). Tokens are stored encrypted. Disconnecting an integration stops new sharing; residual copies may remain with the third party under *their* policies.

### 5.3 Within a Business

Owners/admins control staff access via roles and permissions. Platform support staff may access tenant data **only as needed** for support, security, or legal compliance, subject to internal controls.

### 5.4 Business transfers and legal

We may disclose information in connection with a merger, acquisition, financing, or sale of assets, or when required by law, legal process, or to protect rights, safety, and integrity of the Service or users.

### 5.5 Public content

Information you or a Business choose to publish (public booking pages, social posts set to public, “Powered by” catalogs, etc.) may be visible to others.

---

## 6. International transfers

We may process and store information in the United States and other countries where we or our subprocessors operate. Where required, we use appropriate transfer mechanisms (e.g. SCCs) in customer contracts / DPAs.

---

## 7. Retention

| Category | Typical retention approach |
|----------|----------------------------|
| Account & Business data | For the life of the account/Business relationship, then deletion or anonymization within a reasonable period after closure, subject to legal holds. |
| Customer Content (CRM, messages, forms, etc.) | Retained until the Business deletes it or closes the account; many records use **soft delete** (`deletedAt`) and may remain recoverable for a period. |
| Audit logs | Retained for security and compliance; **no automatic short purge** is guaranteed in product defaults — contact us for enterprise retention needs. |
| Webhook event records | Default cleanup on the order of **~30 days** (configurable). |
| Async job records | Default cleanup on the order of **~90 days** (configurable). |
| Trial signup sessions | Expired sessions cleaned by scheduled jobs. |
| Orphan pending uploads | Cleaned after a short pending window. |
| SMS suppressions | Kept to honor opt-outs. |
| Backups | May persist for a limited backup cycle after deletion. |

Exact periods may vary by plan, legal requirement, or written agreement.

---

## 8. Security

We implement technical and organizational measures appropriate to the Service, including:

- TLS in transit for standard web/API access;
- password hashing (bcrypt) and hashed refresh tokens;
- encryption of integration credentials at rest;
- role- and permission-based access control and businessId scoping;
- soft-delete and confirm-delete patterns for destructive actions;
- rate limiting on sensitive auth and OTP endpoints;
- separation of API, worker, and scheduler processes where deployed.

No method of transmission or storage is 100% secure. You are responsible for protecting staff credentials, PINs, device access, and OAuth connections under your control.

---

## 9. Your choices and rights

### 9.1 Account users (Business and platform staff)

You may:

- access and update profile and many Business settings in-product;
- manage notification preferences;
- disconnect integrations;
- request password reset;
- request account/Business deletion by contacting support (subject to Owner authority and legal retention).

Depending on your location, you may have rights to access, correct, delete, port, restrict, or object to certain processing, and to withdraw consent. Email **support@codesoltech.com**. We may verify identity and, for Customer Content, may redirect end-user requests to the relevant Business.

### 9.2 End customers of a Business

To exercise rights regarding appointments, invoices, messages, or form data held for a Business, contact **that Business** first. We will assist the Business as required by law and contract.

### 9.3 SMS and email communications

- SMS: follow STOP/START or equivalent instructions in messages; suppressions are recorded.
- Email: use unsubscribe links where provided for non-essential mail; transactional mail may still be sent as needed to provide the Service.

### 9.4 Cookies

Browser controls can block cookies; blocking authentication cookies will prevent login. Local storage used by widgets/forms can be cleared in browser settings.

---

## 10. Children’s privacy

The Service is designed for **businesses and their adult staff**, not for children under 13 (or higher age required in your region) as primary users.

- We do not knowingly collect personal information from children for platform accounts.
- Businesses that use YouTube publishing must correctly set **Made for Kids** and related YouTube/COPPA obligations; that designation is the Business’s responsibility.
- Businesses must not use PandaCue to target or collect children’s data unlawfully.

If you believe a child has provided us account data, contact support@codesoltech.com so we can delete it.

---

## 11. Artificial intelligence

The product architecture may include AI-related message types or provider catalog entries (e.g. OpenAI as a platform provider). **If** a Business enables AI features that send content to a model provider, that content may be processed by the provider under its terms. We will describe enabled AI features in-product. Do not submit sensitive data to AI features unless your policies allow it.

---

## 12. Public pages, embeds, and “Powered by” branding

Public booking, payment, form, chat, and catalog pages may display Business branding and/or “Powered by PandaCue.” Visitor data submitted on those pages is Customer Content processed for that Business.

---

## 13. Changes to this Policy

We may update this Policy from time to time. We will post the updated version with a new “Last updated” date and, where required, provide additional notice. Continued use after the effective date constitutes acceptance where permitted by law.

---

## 14. Contact

**Privacy / data requests:** support@codesoltech.com  

**Postal / registered address:** [REGISTERED ADDRESS OF PANDACUE]  

**Data Protection Officer (if appointed):** [DPO NAME / EMAIL OR “N/A”]  

For EU/UK representatives (if required): [EU/UK REPRESENTATIVE DETAILS OR “N/A”]

---

## Appendix A — Summary of data categories (quick reference)

- Identifiers & account credentials  
- Commercial & financial information (invoices, subscriptions, Stripe IDs)  
- Internet / device data (IP, user agent, cookies, realtime connection metadata)  
- Professional / employment-related staff data within a Business  
- Customer Content: CRM, communications content, booking PII, forms, files, social content  
- Inferences limited to product reports configured by the Business  
- Geolocation approximate (timezone, address fields, IP-derived where applicable)  

## Appendix B — Key subprocessors / integration partners (disclosure list)

PostgreSQL host; Redis; Cloudflare R2 (or S3-compatible); Resend; Twilio; Stripe; Meta Platforms; Google; LinkedIn; TikTok; Pinterest; X Corp.; hosting provider(s) for web/API/workers; optional OpenAI or similar if AI features are enabled; optional error monitoring vendor if enabled.

A current subprocessor list may be provided on request or via a customer DPA schedule.
