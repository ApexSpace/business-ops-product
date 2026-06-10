import {
  DEFAULT_TERMINOLOGY,
  EMPTY_SNAPSHOT_ASSETS,
  SnapshotAssets,
} from '../types/snapshot-assets.types';

export function parseSnapshotAssets(raw: unknown): SnapshotAssets {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_SNAPSHOT_ASSETS };
  }

  const o = raw as Record<string, unknown>;
  const terminology =
    o.terminology && typeof o.terminology === 'object'
      ? { ...DEFAULT_TERMINOLOGY, ...(o.terminology as Record<string, string>) }
      : { ...DEFAULT_TERMINOLOGY };

  const navigation = Array.isArray(o.navigation)
    ? (o.navigation as SnapshotAssets['navigation'])
    : [];

  const dashboardRaw =
    o.dashboard && typeof o.dashboard === 'object'
      ? (o.dashboard as SnapshotAssets['dashboard'] & {
          quickLinks?: Array<{ route?: string; href?: string }>;
        })
      : { widgets: [], quickLinks: [] };

  const quickLinks = Array.isArray(dashboardRaw.quickLinks)
    ? dashboardRaw.quickLinks.map((link) => ({
        ...link,
        href: link.href ?? (link as { route?: string }).route ?? '',
      }))
    : [];

  return {
    terminology,
    navigation,
    dashboard: {
      widgets: Array.isArray(dashboardRaw.widgets) ? dashboardRaw.widgets : [],
      quickLinks,
    },
    ...(o.crm && typeof o.crm === 'object' ? { crm: o.crm } : {}),
    ...(Array.isArray(o.calendars)
      ? { calendars: o.calendars as SnapshotAssets['calendars'] }
      : {}),
    ...(Array.isArray(o.chatbots)
      ? { chatbots: o.chatbots as SnapshotAssets['chatbots'] }
      : {}),
    ...(o.emails && typeof o.emails === 'object' ? { emails: o.emails } : {}),
    ...(o.branding && typeof o.branding === 'object'
      ? { branding: o.branding }
      : {}),
    ...(o.integrations && typeof o.integrations === 'object'
      ? { integrations: o.integrations }
      : {}),
  };
}

export function sanitizeSnapshotAssets(assets: SnapshotAssets): SnapshotAssets {
  const trim = (s: string, max: number) => s.trim().slice(0, max);

  return {
    ...assets,
    terminology: Object.fromEntries(
      Object.entries(assets.terminology ?? {}).map(([k, v]) => [
        trim(k, 100),
        trim(String(v), 200),
      ]),
    ),
    navigation: (assets.navigation ?? []).map((item) => ({
      ...item,
      key: trim(item.key, 80),
      route: trim(item.route, 200),
      icon: trim(item.icon, 80),
      labelKey: trim(item.labelKey, 100),
    })),
    dashboard: {
      widgets: (assets.dashboard?.widgets ?? []).map((w) => ({
        ...w,
        key: trim(w.key, 80),
      })),
      quickLinks: (assets.dashboard?.quickLinks ?? []).map((l) => ({
        ...l,
        href: trim(l.href, 200),
        ...(l.labelKey ? { labelKey: trim(l.labelKey, 100) } : {}),
        ...(l.label ? { label: trim(l.label, 200) } : {}),
      })),
    },
    ...(assets.crm
      ? {
          crm: {
            pipelines: assets.crm.pipelines?.map((p) => ({
              ...p,
              sourceKey: trim(p.sourceKey, 80),
              name: trim(p.name, 200),
              stages: p.stages.map((s) => ({
                ...s,
                name: trim(s.name, 200),
              })),
            })),
            services: assets.crm.services?.map((s) => ({
              ...s,
              sourceKey: trim(s.sourceKey, 80),
              name: trim(s.name, 200),
            })),
            tags: assets.crm.tags?.map((t) => ({
              ...t,
              sourceKey: trim(t.sourceKey, 80),
              name: trim(t.name, 100),
            })),
          },
        }
      : {}),
    ...(assets.calendars
      ? {
          calendars: assets.calendars.map((c) => ({
            ...c,
            sourceKey: trim(c.sourceKey, 80),
            name: trim(c.name, 200),
          })),
        }
      : {}),
    ...(assets.chatbots
      ? {
          chatbots: assets.chatbots.map((c) => ({
            ...c,
            sourceKey: trim(c.sourceKey, 80),
            name: trim(c.name, 200),
            rules: c.rules?.map((r) => ({
              ...r,
              sourceKey: trim(r.sourceKey, 80),
              triggerText: trim(r.triggerText, 500),
              responseText: trim(r.responseText, 2000),
            })),
          })),
        }
      : {}),
    ...(assets.emails
      ? {
          emails: {
            preferences: assets.emails.preferences?.map((p) => ({
              emailType: trim(p.emailType, 80),
              enabled: p.enabled,
            })),
            templates: assets.emails.templates?.map((t) => ({
              emailType: trim(t.emailType, 80),
              subject: trim(t.subject, 500),
              htmlBody: t.htmlBody,
              ...(t.textBody ? { textBody: t.textBody } : {}),
            })),
          },
        }
      : {}),
    ...(assets.branding
      ? {
          branding: {
            ...(assets.branding.productName
              ? { productName: trim(assets.branding.productName, 200) }
              : {}),
            ...(assets.branding.accentColor
              ? { accentColor: trim(assets.branding.accentColor, 20) }
              : {}),
            ...(assets.branding.logoUrl
              ? { logoUrl: trim(assets.branding.logoUrl, 500) }
              : {}),
            ...(assets.branding.publicPageTitle
              ? {
                  publicPageTitle: trim(assets.branding.publicPageTitle, 200),
                }
              : {}),
          },
        }
      : {}),
  };
}
