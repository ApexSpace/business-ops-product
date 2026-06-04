#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const libsDir = path.join(root, 'libs');

const MODULE_MAP = {
  audit: '@app/modules/platform/audit',
  auth: '@app/modules/platform/auth',
  business: '@app/modules/platform/business',
  membership: '@app/modules/platform/membership',
  plans: '@app/modules/platform/plans',
  billing: '@app/modules/platform/billing',
  platform: '@app/modules/platform/platform',
  contacts: '@app/modules/crm/contacts',
  leads: '@app/modules/crm/leads',
  pipelines: '@app/modules/crm/pipelines',
  notes: '@app/modules/crm/notes',
  services: '@app/modules/crm/services',
  industries: '@app/modules/crm/industries',
  conversations: '@app/modules/communications/conversations',
  integrations: '@app/modules/integrations/integrations',
  'google-calendar-sync': '@app/modules/integrations/google-calendar-sync',
  invoices: '@app/modules/finance/invoices',
  payments: '@app/modules/finance/payments',
  estimates: '@app/modules/finance/estimates',
  tasks: '@app/modules/operations/tasks',
  appointments: '@app/modules/operations/appointments',
  calendars: '@app/modules/operations/calendars',
  'work-items': '@app/modules/operations/work-items',
};

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function rewrite(content) {
  let out = content;
  for (const [mod, alias] of Object.entries(MODULE_MAP)) {
    const escaped = mod.replace(/-/g, '\\-');
    out = out.replace(
      new RegExp(`from ['"](?:\\.\\./)+${escaped}/`, 'g'),
      `from '${alias}/`,
    );
  }
  return out;
}

let changed = 0;
for (const file of walk(libsDir)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = rewrite(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
  }
}
console.log(`Cross-module: updated ${changed} files`);
