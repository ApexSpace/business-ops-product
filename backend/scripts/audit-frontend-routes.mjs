#!/usr/bin/env node
/**
 * Audits GET endpoints used by the frontend against the backend API.
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
const EMAIL = process.env.AUDIT_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.AUDIT_PASSWORD ?? 'ChangeMe123!';

const BUSINESS_GET_ROUTES = [
  'auth/me',
  'businesses/current',
  'businesses/current/snapshot-context',
  'businesses/current/dashboard-stats',
  'businesses/current/snapshot-context',
  'businesses/current/financial-settings',
  'businesses/current/members?page=1&limit=5',
  'contacts?page=1&limit=5',
  'leads?page=1&limit=5',
  'pipelines',
  'work-items?page=1&limit=5',
  'notes?page=1&limit=5',
  'tasks?page=1&limit=5',
  'appointments?page=1&limit=5',
  'services?page=1&limit=5',
  'calendars?page=1&limit=5',
  'estimates?page=1&limit=5',
  'invoices?page=1&limit=5',
  'payments?page=1&limit=5',
  'payments/overview',
  'conversations?page=1&limit=5',
  'integrations/providers',
  'integrations/business',
  'industries/active',
];

const PLATFORM_GET_ROUTES = [
  'auth/me',
  'platform/dashboard/stats',
  'platform/settings',
  'platform/businesses?page=1&limit=5',
  'platform/users?page=1&limit=5',
  'platform/plans?page=1&limit=5',
  'platform/industries?page=1&limit=5',
  'platform/snapshots?page=1&limit=5',
  'platform/snapshots?page=1&limit=5',
  'platform/audit-logs?page=1&limit=5',
  'platform/billing/overview',
  'platform/billing/subscriptions?page=1&limit=5',
  'platform/integrations/providers',
  'industries/active',
];

async function parseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(`Login failed ${res.status}: ${JSON.stringify(body)}`);
  }
  const data = body.data ?? body;
  return {
    accessToken: data.accessToken ?? data.tokens?.accessToken,
    refreshToken: data.refreshToken ?? data.tokens?.refreshToken,
    user: data.user ?? data,
  };
}

async function switchToBusiness(accessToken, businessId) {
  const res = await fetch(`${BASE}/auth/switch-context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ type: 'business', businessId }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      `switch-context failed ${res.status}: ${JSON.stringify(body)}`,
    );
  }
  const data = body.data ?? body;
  return data.accessToken ?? data.tokens?.accessToken ?? accessToken;
}

async function getMe(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) return null;
  return body.data ?? body;
}

async function testRoute(token, path) {
  const url = `${BASE}/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  const err =
    body?.error?.message ??
    body?.message ??
    (typeof body?.error === 'string' ? body.error : null);
  return {
    path,
    status: res.status,
    ok: res.ok,
    error: err ?? (res.ok ? null : JSON.stringify(body).slice(0, 120)),
  };
}

async function main() {
  console.log(`API base: ${BASE}\n`);
  const { accessToken } = await login();
  const me = await getMe(accessToken);
  const businessId =
    me?.contexts?.find((c) => c.type === 'business')?.businessId ??
    me?.businessMemberships?.[0]?.businessId ??
    me?.businesses?.[0]?.id;
  if (!businessId) {
    console.warn('No business membership found; testing platform routes only.');
  }

  const results = [];

  console.log('=== Platform context (login token) ===');
  for (const path of PLATFORM_GET_ROUTES) {
    const r = await testRoute(accessToken, path);
    results.push({ context: 'platform', ...r });
    console.log(`${r.status}\t${path}${r.error ? `\t${r.error}` : ''}`);
  }

  if (businessId) {
    const bizToken = await switchToBusiness(accessToken, businessId);
    console.log(`\n=== Business context (${businessId}) ===`);
    for (const path of BUSINESS_GET_ROUTES) {
      const r = await testRoute(bizToken, path);
      results.push({ context: 'business', ...r });
      console.log(`${r.status}\t${path}${r.error ? `\t${r.error}` : ''}`);
    }
  }

  const failures = results.filter((r) => !r.ok);
  console.log(`\n--- Summary: ${failures.length} failures / ${results.length} tested ---`);
  for (const f of failures) {
    console.log(`[${f.context}] ${f.status} ${f.path}: ${f.error}`);
  }
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
