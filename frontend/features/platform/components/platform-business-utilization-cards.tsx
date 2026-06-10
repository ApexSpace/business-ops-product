"use client";

import { cn } from "@/lib/utils";
import type { PlatformBusinessUtilization } from "@/features/platform/types";

function formatIntegrationProviders(
  providers: PlatformBusinessUtilization["integrations"]["providers"],
): string {
  if (!providers.length) return "None connected";
  return providers.map((provider) => provider.name).join(", ");
}

interface AdoptionItem {
  label: string;
  value: number | string;
  adopted: boolean;
  detail: string;
}

interface AdoptionGroup {
  title: string;
  items: AdoptionItem[];
}

function buildAdoptionGroups(
  utilization: PlatformBusinessUtilization,
): AdoptionGroup[] {
  const { crm, operations, finance, communications, integrations, team } =
    utilization;

  return [
    {
      title: "CRM",
      items: [
        {
          label: "Contacts",
          value: crm.contacts,
          adopted: crm.contacts > 0,
          detail:
            crm.contacts > 0
              ? `${crm.contacts} contacts`
              : "Not set up",
        },
        {
          label: "Pipeline",
          value: crm.leads.active,
          adopted: crm.pipelines > 0,
          detail:
            crm.pipelines > 0
              ? `${crm.leads.active} leads active`
              : "Not set up",
        },
        {
          label: "Services & tags",
          value: crm.services + crm.tags,
          adopted: crm.services > 0 || crm.tags > 0,
          detail:
            crm.services > 0 || crm.tags > 0
              ? `${crm.services} services · ${crm.tags} tags`
              : "Not set up",
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: "Calendars",
          value: operations.calendars,
          adopted: operations.calendars > 0,
          detail:
            operations.calendars > 0
              ? `${operations.appointmentStats.upcoming} upcoming appts`
              : "Not set up",
        },
        {
          label: "Work items",
          value: operations.workItems.total,
          adopted: operations.workItems.total > 0,
          detail:
            operations.workItems.total > 0
              ? `${operations.workItems.pending} in progress`
              : "Not set up",
        },
      ],
    },
    {
      title: "Finance",
      items: [
        {
          label: "Estimates",
          value: finance.estimates,
          adopted: finance.estimates > 0,
          detail:
            finance.estimates > 0
              ? `${finance.estimates} estimates`
              : "Not set up",
        },
        {
          label: "Invoices",
          value: finance.invoices,
          adopted: finance.invoices > 0,
          detail:
            finance.invoices > 0
              ? `${finance.invoicesPaid} paid`
              : "Not set up",
        },
        {
          label: "Transactions",
          value: finance.payments,
          adopted: finance.payments > 0,
          detail:
            finance.payments > 0
              ? `${finance.payments} transactions`
              : "Not set up",
        },
      ],
    },
    {
      title: "Communications",
      items: [
        {
          label: "Chatbots",
          value: communications.chatbots,
          adopted: communications.chatbots > 0,
          detail:
            communications.chatbots > 0
              ? `${communications.chatbotRules} rules`
              : "Not set up",
        },
        {
          label: "Email templates",
          value: communications.emailTemplatesCustomized,
          adopted: communications.emailTemplatesCustomized > 0,
          detail:
            communications.emailTemplatesCustomized > 0
              ? `${communications.emailPreferencesEnabled} prefs enabled`
              : "Not set up",
        },
      ],
    },
    {
      title: "Integrations",
      items: [
        {
          label: "Connected",
          value: integrations.connected,
          adopted: integrations.connected > 0,
          detail:
            integrations.connected > 0
              ? formatIntegrationProviders(integrations.providers)
              : "Not set up",
        },
      ],
    },
    {
      title: "Team",
      items: [
        {
          label: "Active members",
          value: team.activeMembers,
          adopted: team.activeMembers > 0,
          detail:
            team.activeMembers > 0
              ? `${team.activeMembers} active`
              : "Not set up",
        },
        {
          label: "Invited members",
          value: team.invitedMembers,
          adopted: team.invitedMembers > 0,
          detail:
            team.invitedMembers > 0
              ? `${team.invitedMembers} invited`
              : "All members active",
        },
      ],
    },
  ];
}

function AdoptionGroupColumn({
  group,
  index,
  totalGroups,
}: {
  group: AdoptionGroup;
  index: number;
  totalGroups: number;
}) {
  const isFirstRow = index < 3;
  const isLastGroup = index === totalGroups - 1;
  const isNotLastColumn = index % 3 !== 2;

  return (
    <div
      className={cn(
        "min-w-0 px-4 py-3",
        index > 0 && "border-t border-border/60 sm:border-t-0",
        index % 3 !== 0 && "sm:border-l sm:border-border/60",
        index >= 3 && "sm:border-t sm:border-border/60",
        isFirstRow &&
          totalGroups > 3 &&
          "sm:border-b sm:border-border/60",
        isNotLastColumn &&
          isLastGroup &&
          "sm:border-r sm:border-border/60",
      )}
    >
      <h4 className="text-sm font-medium">{group.title}</h4>
      <div className="mt-1 divide-y divide-border/60">
        {group.items.map((item) => (
          <AdoptionRow key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

function AdoptionRow({ item }: { item: AdoptionItem }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)]",
        !item.adopted && "text-muted-foreground",
      )}
    >
      <span>{item.label}</span>
      <span
        className={cn(
          "text-right font-medium tabular-nums sm:text-left",
          item.adopted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.value}
      </span>
      <span className="col-span-2 truncate text-xs text-muted-foreground sm:col-span-1 sm:text-right">
        {item.detail}
      </span>
    </div>
  );
}

export function PlatformBusinessUtilizationSection({
  utilization,
}: {
  utilization: PlatformBusinessUtilization;
}) {
  const groups = buildAdoptionGroups(utilization);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3">
      {groups.map((group, index) => (
        <AdoptionGroupColumn
          key={group.title}
          group={group}
          index={index}
          totalGroups={groups.length}
        />
      ))}
    </div>
  );
}
