# Social media platforms — implementation & developer-portal submissions

**Product:** PandaCue  
**Purpose:** Reference for how Social Planner / Integrations are built in this repo, and how app-review / OAuth verification was submitted on each developer portal.  
**Environments:** `https://dev.pandacue.com` (app), `https://dev-api.pandacue.com` (API). Legal entity pages often live on `https://www.codesoltech.com`.  
**Last captured:** 2026-08-14 (from work through 2026-08-07 plus codebase as of this date).

Do **not** put secrets, client secrets, or access tokens in this file. Env var **names** only.

---

## 1. Product model (all networks)

PandaCue is a **multi-tenant SaaS**. Each customer business connects **their own** social account from **Settings → Integrations**. Tokens are stored **per business**, encrypted (`INTEGRATION_ENCRYPTION_KEY`). Disconnect revokes where the provider supports it.

**Least privilege:** each “Connect” button starts a **separate** OAuth flow with **only that product’s scopes** (not one mega-consent for all Google/Meta APIs).

**User-facing path**

1. Login (business Owner/Admin with Integrations permission).  
2. Settings → Integrations.  
3. Connect `<network>` → popup → `/api/oauth/<provider>/start` (Next BFF) → Nest `…/integrations/oauth/…/start` → provider authorize URL.  
4. Callback on API (`BACKEND_PUBLIC_URL` + `/api/v1/integrations/oauth/…/callback`).  
5. Social Planner → Compose → choose destination → Post now / Schedule.  
6. Worker publishes; status poll / engagement where implemented.

**Frontend OAuth start map** (`frontend/features/integrations/utils/integrations.ts`)

| Provider key | Start route |
|--------------|-------------|
| `youtube`, `google-calendar`, `google-business-profile`, `google-lead-ads` | `/api/oauth/google/start?providerKey=…` |
| `facebook`, `instagram` | `/api/oauth/meta/start?providerKey=…` |
| `whatsapp` | `/api/oauth/meta/whatsapp/start` |
| `linkedin` | `/api/oauth/linkedin/start` |
| `x` | `/api/oauth/x/start` |
| `pinterest` | `/api/oauth/pinterest/start` |
| `tiktok` | `/api/oauth/tiktok/start` |

**OAuth error redirects (production):** Next start routes must not use raw `request.url` as the callback base behind Docker (`0.0.0.0:3000` → `ERR_ADDRESS_INVALID`). Use `frontend/lib/oauth/oauth-app-origin.ts` + `NEXT_PUBLIC_APP_URL=https://dev.pandacue.com`.

**Env (names):** `FRONTEND_URL`, `CORS_ORIGIN`, `BACKEND_PUBLIC_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL` (internal), `API_PREFIX=api/v1`.

**Media:** uploads go to object storage (Cloudflare R2). Public pull URLs use `R2_PUBLIC_BASE_URL` (e.g. `files.codesoltech.com`) — required for TikTok `pull_by_url` domain verification.

---

## 2. TikTok

### 2.1 Code

| Area | Location |
|------|----------|
| Scopes | `backend/libs/modules/integrations/integrations/constants/social-oauth.constants.ts` |
| OAuth start/callback | `social-oauth.controller.ts`, `social-oauth.service.ts` |
| Tokens / refresh / revoke | `tiktok-token.service.ts` |
| Publish adapter | `communications/social-planner/adapters/tiktok.adapter.ts` + `tiktok/` |
| Composer UI | `frontend/features/social-planner/components/tiktok-destination-fields.tsx` |
| Next start | `frontend/app/api/oauth/tiktok/start/route.ts` |

**Scopes requested in app**

- `user.info.basic`  
- `user.info.profile`  
- `video.upload` (inbox / draft upload)  
- `video.publish` (Direct Post)

**OAuth details**

- Authorize: `https://www.tiktok.com/v2/auth/authorize/`  
- Token: `https://open.tiktokapis.com/v2/oauth/token/`  
- Client env: `TIKTOK_OAUTH_CLIENT_KEY`, `TIKTOK_OAUTH_CLIENT_SECRET`, `TIKTOK_OAUTH_REDIRECT_URI`  
- Param is `client_key` (not `client_id`).  
- `disable_auto_auth=1` so reconnect is not silently auto-approved.  
- `assertConfigured` 400 if key/secret missing in **running** process (env change without API redeploy).  
- `assertOAuthProvider` 400 if DB row `key=tiktok` is not active OAUTH business-level.

**Publish approach**

- Prefer **Content Posting API Direct Post** (`video.publish`) via **`pull_by_url`** from verified media domain (`files.codesoltech.com`).  
- Fallback: inbox / `video.upload` when Direct Post is blocked (unaudited / private account).  
- Init: `post/publish/video/init/` ; status: `post/publish/status/fetch/` ; creator options: `creator_info/query/`.  
- Privacy levels from creator_info (`PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY`). Branded content cannot use `SELF_ONLY`.  
- Status poll: `PUBLISH_COMPLETE` without a public video id is still success for private posts (use `publish_id`).  
- Organic TikTok **comments** are not available via Login Kit / Content Posting API (unlike YouTube/Meta).

**Start failure that looked like a bad URL:** backend `GET /api/v1/integrations/oauth/tiktok/start` returned **400** → Next set `oauth_start_failed` and redirected using Docker `0.0.0.0`. Root cause was often **TikTok env not loaded until API redeploy**, plus error URL origin.

### 2.2 Developer portal submission

**App name:** `PandaCue` (must match UI + demo; not parent logo-only).  
**Category:** Business.  
**Platforms:** **Web only** (do not tick Android/iOS unless you demo native apps).

**Description (function, not corporate structure)**  
Example: *PandaCue: multi-tenant business platform to connect TikTok and schedule/publish original social videos.*

**URLs (what reviewers enforce)**

| Field | Value used | Rule |
|--------|------------|------|
| Web/Desktop URL | Production-looking PandaCue host (TikTok rejected `dev.` as staging / login-only) | **Must match domain in demo address bar** |
| Terms | `https://www.codesoltech.com/terms-conditions/` | OK if pages name **PandaCue** |
| Privacy | `https://www.codesoltech.com/privacy-policy/` | Same; footer links on the Web URL, not buried |
| Redirect URIs | `https://dev-api.pandacue.com/api/v1/integrations/oauth/tiktok/callback` (also listed `api.pandacue.com` and legacy `fb-login.codesoltech.com`) | Demo OAuth must hit a listed URI |

**Products:** Login Kit + Content Posting API (**Direct Post** on). Verify `pull_by_url` domains.

**Review explanation (products/scopes)**  
PandaCue is multi-tenant SaaS. Each customer connects their own TikTok and publishes **original** content from Social Planner (no scrape/repost of arbitrary third-party content).

- Login Kit (`user.info.basic`, `user.info.profile`): Integrations → Connect TikTok → store tokens per business → show creator profile.  
- Content Posting (`video.upload`, `video.publish`): compose caption + video on R2 → TikTok destination → privacy/interaction → Schedule or Post now → init via Content Posting API pull_by_url.

**Rejection / support feedback we addressed**

1. Website in form ≠ domain in demo.  
2. `dev.` subdomain looks like development; they want a fully developed public site (not login-only).  
3. App name/icon vs parent/corporate logo mismatch.  
4. Description was corporate (“child of parent”) instead of **what the product does**.  
5. Privacy/Terms must be visible on the submitted website (footer).  
6. Demo must be end-to-end Connect + publish/schedule with **all selected scopes**. First-time apps: sandbox demo on Developer Portal as required.

**Resubmit reason (≤120 chars example)**  
`Resubmit: fixed website/demo match on PandaCue; Login Kit + Direct Post publish/schedule flow.`

**Sandbox vs production keys:** sandbox `TIKTOK_OAUTH_CLIENT_KEY` prefix `sb…` for testing; production keys kept commented until audit. Redirect URIs must be saved/applied on the TikTok app.

---

## 3. Google (YouTube + Business Profile verification)

### 3.1 Code (multiple Google products)

| Key | Scopes in code | Feature |
|-----|----------------|---------|
| `youtube` | `openid`, `email`, `profile`, `youtube.upload`, `youtube.force-ssl` | Social Planner upload, comments/engagement, Made for Kids, categories |
| `google-calendar` | `openid`, `email`, `profile`, `calendar.events`, `calendar.readonly` | Appointment ↔ Google Calendar sync |
| `google-business-profile` | `openid`, `email`, `profile`, `business.manage` | List/select GBP locations |
| `google-lead-ads` | `openid`, `email`, `profile`, `adwords` | Lead form import (do **not** include in verification unless demoed) |

Constants: `backend/libs/modules/integrations/integrations/constants/google-oauth.constants.ts`.  
Start: `GET …/integrations/oauth/google/start?providerKey=…`.  
YouTube publish: chunked resumable upload, processing poll, validation (`youtube-validation.util.ts`).  
Disconnect: Google token revoke. Refresh failure → EXPIRED. Nested-reply guard + comment prune on engagement.

**Env:** `GOOGLE_OAUTH_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`  
Example redirect: `https://dev-api.pandacue.com/api/v1/integrations/oauth/google/callback`  
Project: **codesol-technologies**, number **163558663772**.

### 3.2 What was submitted for verification (2026-08)

**Sensitive (approval required)**

- `youtube.upload` — Manage YouTube videos  
- `youtube.force-ssl` — See/edit/delete videos, ratings, comments, captions  

**Non-sensitive (also requested)**

- `business.manage` — Google business listings  
- `userinfo.email`, `userinfo.profile`, `openid`

**Not in that verification round:** Calendar, AdWords/Lead Ads (exist in code; omit unless demoed). **CASA** not required for these Sensitive scopes (not Drive/Gmail Restricted). **Data Portability APIs:** N/A.

**Console “How will the scopes be used?” (keep YouTube + GBP)**

PandaCue is multi-tenant SaaS. Least privilege per Connect. Data only for user-facing features; not sold; not ads; not AI/ML training. Revoke on disconnect.

- `openid` / `email` / `profile`: identify and display the connected Google account in Integrations.  
- `business.manage`: Integrations → Connect Google Business Profile → list/select locations; mutations only when the user acts in-app.  
- `youtube.upload`: Social Planner upload/publish/schedule original videos (title, description, privacy, made-for-kids, category, media). No scrape of unrelated libraries.  
- `youtube.force-ssl`: Engagement on published videos — list comments, reply to top-level, delete on user request, sync likes/comments/views. Not unrelated channel editing.  
- `youtube.readonly` cannot upload or manage comments.

**Demo video requirements (Google checklist)**

- Unlisted or public YouTube.  
- Consent with **all** scopes expanded (“Show all”).  
- Scopes in Console = app = video.  
- Show **write impact on the Google/YouTube account** (video appears; comment change; GBP locations listed).  
- Test login with **no** phone OTP / credit card wall.  
- Navigation: Login → Settings → Integrations → Connect GBP → Connect YouTube → Social Planner compose/publish/engage.

**Privacy Policy for Console:** URL that **names PandaCue** and covers Google data + Limited Use. Parent `https://www.codesoltech.com/privacy-policy/` is OK **only if** it mentions PandaCue + Google OAuth. Draft copy: `docs/legal/privacy-policy.md`. Homepage in Console = product users see (`dev.pandacue.com` / production app), not only the parent site.

**Google email (“automated compliance notification”)**  
Standard checklist — **not** an order to change the app if already complete. **Do not** re-edit Cloud Console after a complete submission (can delay/reset). **Reply to the email** with confirmation, demo link, privacy URL, test credentials, navigation. Include **business.manage** in the reply because the demo shows GBP connect.

---

## 4. Meta (Facebook, Instagram, WhatsApp)

**Code:** `backend/libs/modules/integrations/integrations/meta/`  
**Start:** `/api/oauth/meta/start`, WhatsApp `/api/oauth/meta/whatsapp/start`, platform variants under `/api/oauth/meta/platform/`.  
**Embedded Signup** for WhatsApp (`META_EMBEDDED_SIGNUP_CONFIG_ID`). Separate Facebook / Instagram login config IDs.  
**Webhooks:** `META_WEBHOOK_CALLBACK_URL` → `/api/v1/webhooks/meta`.  
**Social Planner:** Facebook/Instagram destination schemas in `platform-schema.registry.ts`. Inbox channels FACEBOOK / INSTAGRAM / WHATSAPP.

**Env names:** `META_OAUTH_ENABLED`, `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_GRAPH_API_VERSION`, login config IDs, webhook verify token.

**Portal approach:** Meta App Review is separate from Google/TikTok. Redirect example: `https://dev-api.pandacue.com/api/v1/integrations/oauth/meta/callback`. Historical host `fb-login.codesoltech.com` still appears in some configs.

---

## 5. LinkedIn

**OAuth:** Nest LinkedIn module + `frontend/app/api/oauth/linkedin/start/route.ts`.  
**Env:** `LINKEDIN_OAUTH_ENABLED`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_API_VERSION`.  
**Social Planner:** company-page posting schema (`linkedin` in platform registry).  
**Redirect:** `https://dev-api.pandacue.com/api/v1/integrations/oauth/linkedin/callback`.  
Company Pages + Social Planner; use `oauth-app-origin` for error redirects.

---

## 6. X (Twitter)

**Scopes in code:** `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `media.write`.  
**PKCE** on start (`code_challenge` S256).  
**Env:** `X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET`, `X_OAUTH_REDIRECT_URI`.  
Start: `/api/oauth/x/start`.

---

## 7. Pinterest

**Scopes:** `boards:read`, `boards:write`, `pins:read`, `pins:write`, `user_accounts:read`.  
**Sandbox:** `PINTEREST_API_USE_SANDBOX=true` for trial apps (pin create); set false after Standard Access.  
**Env:** `PINTEREST_OAUTH_CLIENT_ID`, `PINTEREST_OAUTH_CLIENT_SECRET`, `PINTEREST_OAUTH_REDIRECT_URI`.  
**Portal note:** “Generate token” ≠ app OAuth. Standard Access needs **app OAuth** + Business account + demo. Code has OAuth + thin image pin; board sync / video / multi-board may still be incomplete vs Meta/YouTube.

---

## 8. YouTube implementation notes (beyond OAuth review)

- Two-step validation: `madeForKids` required boolean (COPPA / YouTube).  
- Privacy status, category, Shorts rules in `youtube-validation.util.ts`.  
- Chunked resumable upload + processing poll; treat processing complete without public id per product rules.  
- Engagement: pagination, nested-reply guard, prune deleted comments, cascade soft-delete.  
- Google API Services User Data Policy / Limited Use: no ads, no sale, no generalized model training on Google user data.

---

## 9. Branding & legal (all portals)

| Item | Approach |
|------|----------|
| Legal entity | PandaCue |
| Product name | PandaCue |
| App name on stores/portals | `PandaCue` |
| Icon | PandaCue (or PandaCue-led), not parent-only logo |
| Terms / Privacy URLs | Parent codesoltech.com **if** they name PandaCue + relevant data practices |
| Product Web URL | Same host as demo; production-looking; footer Privacy + Terms |
| Draft policies | `docs/legal/privacy-policy.md`, `docs/legal/terms-and-conditions.md` |

---

## 10. Shared production pitfalls

1. **`NEXT_PUBLIC_*` is build-time.** Coolify runtime env does not update the client bundle. Trial signup was failing with `NEXT_PUBLIC_BACKEND_URL is not configured` on `dev.pandacue.com` until BFF routes `/api/public/trial/*` proxied via runtime `BACKEND_URL`. Trial Nest routes are **excluded** from `api/v1` prefix (`/public/trial/…` on `BACKEND_PUBLIC_URL`).  
2. **OAuth start 400** = missing env in running API **or** inactive `integration_providers` row — not the TikTok website URL.  
3. **Missing module** `frontend/lib/oauth/oauth-app-origin.ts` broke LinkedIn/Stripe frontend Docker build (`Can't resolve '@/lib/oauth/oauth-app-origin'`).  
4. Remove leftover `#region agent log` / `127.0.0.1:7562` ingest before production.  
5. Marketing site (`pandacue.com`) should **embed** `https://dev.pandacue.com/widget/trial` rather than rebuild OTP; or set public API origin on that site.

---

## 11. File index (code)

```
backend/libs/modules/integrations/integrations/social-oauth.*
backend/libs/modules/integrations/integrations/google-oauth.*
backend/libs/modules/integrations/integrations/constants/google-oauth.constants.ts
backend/libs/modules/integrations/integrations/constants/social-oauth.constants.ts
backend/libs/modules/integrations/integrations/meta/
backend/libs/modules/communications/social-planner/
frontend/app/api/oauth/*/start/route.ts
frontend/lib/oauth/oauth-app-origin.ts
frontend/features/integrations/utils/integrations.ts
frontend/features/social-planner/
frontend/app/api/public/trial/
docs/legal/privacy-policy.md
docs/legal/terms-and-conditions.md
```

---

## 12. Checklist before a new portal submission

- [ ] App name + icon + description match **PandaCue** UI in the demo.  
- [ ] Web URL host = address bar in demo; not a bare login if the portal forbids it.  
- [ ] Redirect URIs listed and applied; demo uses one of them.  
- [ ] Scopes in portal = scopes in code **for that Connect button** = scopes shown in video.  
- [ ] Privacy/Terms public, name the product, cover that network’s data.  
- [ ] Test account with no OTP/payment blockers.  
- [ ] After a complete Google Console package: **reply to the compliance email**; do not needlessly re-save Console.  
