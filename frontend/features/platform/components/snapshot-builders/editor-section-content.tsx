"use client";

import { OverviewBuilder } from "@/features/platform/components/snapshot-builders/overview-builder";
import { EntityLabelsBuilder } from "@/features/platform/components/snapshot-builders/entity-labels-builder";
import { NavigationBuilder } from "@/features/platform/components/snapshot-builders/navigation-builder";
import { DashboardBuilder } from "@/features/platform/components/snapshot-builders/dashboard-builder";
import { CrmBuilder } from "@/features/platform/components/snapshot-builders/crm-builder";
import { ServicesBuilder } from "@/features/platform/components/snapshot-builders/services-builder";
import { CalendarsBuilder } from "@/features/platform/components/snapshot-builders/calendars-builder";
import { ChatbotsBuilder } from "@/features/platform/components/snapshot-builders/chatbots-builder";
import { EmailsBuilder } from "@/features/platform/components/snapshot-builders/emails-builder";
import { PreviewCenterBuilder } from "@/features/platform/components/snapshot-builders/preview-center-builder";
import { AdvancedBuilder } from "@/features/platform/components/snapshot-builders/advanced-builder";
import type { SnapshotEditorSection } from "@/features/platform/hooks/use-snapshot-editor";

const BUILDERS: Record<SnapshotEditorSection, React.ComponentType> = {
  overview: OverviewBuilder,
  labels: EntityLabelsBuilder,
  navigation: NavigationBuilder,
  dashboard: DashboardBuilder,
  crm: CrmBuilder,
  services: ServicesBuilder,
  calendars: CalendarsBuilder,
  chatbots: ChatbotsBuilder,
  emails: EmailsBuilder,
  preview: PreviewCenterBuilder,
  advanced: AdvancedBuilder,
};

export function SnapshotEditorSectionContent({
  section,
}: {
  section: SnapshotEditorSection;
}) {
  const Builder = BUILDERS[section];
  return <Builder key={section} />;
}
