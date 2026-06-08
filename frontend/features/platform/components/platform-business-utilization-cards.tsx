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
  const { crm, operations, finance, communications, integrations } =
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
          label: "Invoices",
          value: finance.invoices,
          adopted: finance.invoices > 0,
          detail:
            finance.invoices > 0
              ? `${finance.invoicesPaid} paid`
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
  ];
}

function VolumeMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function AdoptionGroupColumn({ group }: { group: AdoptionGroup }) {
  return (
    <div className="min-w-0 px-4 py-3 first:pt-0 last:pb-0 sm:py-0 sm:first:pl-0 sm:last:pr-0">
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
  const { crm, operations } = utilization;
  const groups = buildAdoptionGroups(utilization);

  return (
    <div className="divide-y">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Volume
        </span>
        <VolumeMetric label="Contacts" value={crm.contacts} />
        <VolumeMetric label="Leads" value={crm.leads.active} />
        <VolumeMetric
          label="Appts today"
          value={operations.appointmentStats.today}
        />
        <VolumeMetric label="Work items" value={operations.workItems.total} />
      </div>

      <div className="px-4 py-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Feature adoption
        </h3>
        <div className="mt-4 -mx-4">
          <div className="grid divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {groups.slice(0, 3).map((group) => (
              <AdoptionGroupColumn key={group.title} group={group} />
            ))}
          </div>
          {groups.length > 3 ? (
            <div className="grid gap-6 border-t border-border/60 px-4 pt-6 sm:grid-cols-2">
              {groups.slice(3).map((group) => (
                <div key={group.title}>
                  <h4 className="text-sm font-medium">{group.title}</h4>
                  <div className="mt-1 divide-y divide-border/60">
                    {group.items.map((item) => (
                      <AdoptionRow key={item.label} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
