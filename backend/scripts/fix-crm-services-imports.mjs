#!/usr/bin/env node
/**
 * Fixes mistaken @app/modules/crm/services/* paths from over-broad "services" mapping.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPLACEMENTS = {
  // platform
  'auth.service': '@app/modules/platform/auth/services/auth.service',
  'audit.service': '@app/modules/platform/audit/services/audit.service',
  'business.service': '@app/modules/platform/business/services/business.service',
  'billing.service': '@app/modules/platform/billing/services/billing.service',
  'dashboard-stats.service': '@app/modules/platform/business/services/dashboard-stats.service',
  'financial-settings.service': '@app/modules/platform/business/services/financial-settings.service',
  'membership.service': '@app/modules/platform/membership/services/membership.service',
  'platform-user.service': '@app/modules/platform/membership/services/platform-user.service',
  'plans.service': '@app/modules/platform/plans/services/plans.service',
  'platform-settings.service': '@app/modules/platform/platform/services/platform-settings.service',
  'platform-dashboard.service': '@app/modules/platform/platform/services/platform-dashboard.service',
  // crm
  'contacts.service': '@app/modules/crm/contacts/services/contacts.service',
  'contact-tags.service': '@app/modules/crm/contacts/services/contact-tags.service',
  'leads.service': '@app/modules/crm/leads/services/leads.service',
  'pipelines.service': '@app/modules/crm/pipelines/services/pipelines.service',
  'pipeline-stages.service': '@app/modules/crm/pipelines/services/pipeline-stages.service',
  'notes.service': '@app/modules/crm/notes/services/notes.service',
  'services.service': '@app/modules/crm/services/services/services.service',
  'services.module': '@app/modules/crm/services/services.module',
  'industries.service': '@app/modules/crm/industries/services/industries.service',
  'repositories/service.repository': '@app/modules/crm/services/repositories/service.repository',
  // communications
  'conversations.service': '@app/modules/communications/conversations/services/conversations.service',
  'conversation-messages.service': '@app/modules/communications/conversations/services/conversation-messages.service',
  'conversation-assignment.service': '@app/modules/communications/conversations/services/conversation-assignment.service',
  // integrations
  'meta-webhook.service': '@app/modules/integrations/integrations/meta/services/meta-webhook.service',
  'meta-oauth.service': '@app/modules/integrations/integrations/meta/services/meta-oauth.service',
  'meta-oauth-callback.router': '@app/modules/integrations/integrations/meta/services/meta-oauth-callback.router',
  'meta-embedded-signup.service': '@app/modules/integrations/integrations/meta/services/meta-embedded-signup.service',
  'meta-api-client': '@app/modules/integrations/integrations/meta/services/meta-api-client',
  'meta-config.service': '@app/modules/integrations/integrations/meta/services/meta-config.service',
  'stripe-webhook.service': '@app/modules/integrations/integrations/stripe/services/stripe-webhook.service',
  'stripe-oauth.service': '@app/modules/integrations/integrations/stripe/services/stripe-oauth.service',
  'google-token.service': '@app/modules/integrations/integrations/services/google-token.service',
  // finance
  'invoices.service': '@app/modules/finance/invoices/services/invoices.service',
  'estimates.service': '@app/modules/finance/estimates/services/estimates.service',
  'payments.service': '@app/modules/finance/payments/services/payments.service',
  'payments-overview.service': '@app/modules/finance/payments/services/payments-overview.service',
  // operations
  'tasks.service': '@app/modules/operations/tasks/services/tasks.service',
  'appointments.service': '@app/modules/operations/appointments/services/appointments.service',
  'calendars.service': '@app/modules/operations/calendars/services/calendars.service',
  'work-items.service': '@app/modules/operations/work-items/services/work-items.service',
};

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

let changed = 0;
for (const file of walk(path.join(root, 'libs'))) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;
  for (const [suffix, target] of Object.entries(REPLACEMENTS)) {
    const wrong = `@app/modules/crm/services/${suffix}`;
    if (updated.includes(wrong)) {
      updated = updated.split(wrong).join(target);
    }
  }
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}
console.log(`Fixed ${changed} files`);
