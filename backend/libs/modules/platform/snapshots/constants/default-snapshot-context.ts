import {
  DEFAULT_TERMINOLOGY,
  SnapshotAssets,
} from '../types/snapshot-assets.types';

export interface SnapshotContextResponse {
  snapshotId: string | null;
  snapshotName: string;
  contextVersion: string;
  terminology: Record<string, string>;
  navigation: SnapshotAssets['navigation'];
  dashboard: SnapshotAssets['dashboard'];
  branding: SnapshotAssets['branding'];
}

export const DEFAULT_SNAPSHOT_CONTEXT: SnapshotContextResponse = {
  snapshotId: null,
  snapshotName: 'Default',
  contextVersion: new Date(0).toISOString(),
  terminology: { ...DEFAULT_TERMINOLOGY },
  navigation: [
    {
      key: 'dashboard',
      route: '/business/dashboard',
      icon: 'layout-dashboard',
      labelKey: 'nav.dashboard',
      order: 1,
    },
    {
      key: 'contacts',
      route: '/business/contacts',
      icon: 'contact',
      labelKey: 'nav.contacts',
      order: 2,
    },
    {
      key: 'conversations',
      route: '/business/conversations',
      icon: 'message-square',
      labelKey: 'nav.conversations',
      order: 3,
    },
    {
      key: 'pipelines',
      route: '/business/pipelines',
      icon: 'git-branch',
      labelKey: 'nav.pipelines',
      order: 4,
    },
    {
      key: 'work-items',
      route: '/business/work-items',
      icon: 'clipboard-list',
      labelKey: 'nav.workItems',
      order: 5,
    },
    {
      key: 'appointments',
      route: '/business/appointments',
      icon: 'calendar',
      labelKey: 'nav.appointments',
      order: 6,
    },
    {
      key: 'payments',
      route: '/business/payments',
      icon: 'credit-card',
      labelKey: 'nav.payments',
      order: 7,
    },
  ],
  dashboard: {
    widgets: [
      { key: 'leads', order: 1 },
      { key: 'contacts', order: 2 },
      { key: 'appointments', order: 3 },
      { key: 'conversations', order: 4 },
      { key: 'workItems', order: 5 },
      { key: 'teamMembers', order: 6 },
    ],
    quickLinks: [
      { href: '/business/contacts', labelKey: 'nav.contacts', order: 1 },
      { href: '/business/work-items', labelKey: 'nav.workItems', order: 2 },
      { href: '/business/pipelines', labelKey: 'nav.pipelines', order: 3 },
      { href: '/business/appointments', labelKey: 'nav.appointments', order: 4 },
      { href: '/business/conversations', labelKey: 'nav.conversations', order: 5 },
      { href: '/business/settings/team', label: 'Team', order: 6 },
    ],
  },
  branding: {},
};
