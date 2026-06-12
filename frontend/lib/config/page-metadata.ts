import { isBusinessSettingsPath } from "@/lib/config/navigation/business-settings-menu";
import { resolveTerminology } from "@/lib/snapshot/resolve-terminology";

export interface PageBreadcrumb {
  label: string;
  href?: string;
}

export interface PageMetadata {
  title: string;
  description?: string;
  breadcrumbs?: PageBreadcrumb[];
}

export interface PageMetadataContext {
  mode: "platform" | "business";
  terminology?: Record<string, string>;
  settingsMode?: boolean;
}

interface RouteEntry {
  title: string;
  description?: string;
  breadcrumbs?: PageBreadcrumb[];
}

const businessRoutes: Record<string, RouteEntry> = {
  "/business/dashboard": {
    title: "Dashboard",
    description: "Leads, appointments, messages, and follow-ups at a glance.",
  },
  "/business/contacts": {
    title: "Contacts",
    description: "Manage contacts and customer records.",
  },
  "/business/pipelines": {
    title: "CRM Pipeline",
    description:
      "Select a pipeline and manage every lead by stage on one board.",
  },
  "/business/work-items": {
    title: "Work Items",
    description:
      "Record customer, service, and work done — visits, jobs, sessions, or cases.",
  },
  "/business/notes": {
    title: "Notes",
    description: "Free-form notes linked to contacts and leads.",
  },
  "/business/tasks": {
    title: "Tasks",
    description: "Follow-up actions with due dates, status, and assignees.",
  },
  "/business/payments": {
    title: "Payments",
    description:
      "Estimates, invoices, and transactions in one financial workspace.",
  },
  "/business/estimates": {
    title: "Payments",
    description: "Estimates — quotes and conversion to invoices.",
  },
  "/business/invoices": {
    title: "Payments",
    description: "Invoices — billing and balance tracking.",
  },
  "/business/conversations": {
    title: "Conversations",
    description: "WhatsApp, SMS, and email inbox.",
  },
  "/business/appointments": {
    title: "Appointments",
    description: "Booking calendar.",
  },
  "/business/settings/profile": {
    title: "Business Profile",
    description:
      "Business details, logo, address, timezone, and default tax and currency settings.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Business Profile" },
    ],
  },
  "/business/settings/team": {
    title: "Team Members",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Team Members" },
    ],
  },
  "/business/settings/calendars": {
    title: "Calendars",
    description:
      "Configure booking calendars, availability, staff, and optional Google Calendar sync.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Calendars" },
    ],
  },
  "/business/settings/services": {
    title: "Services",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Services" },
    ],
  },
  "/business/settings/pipelines": {
    title: "Pipelines",
    description:
      "Define pipeline names and stages. Day-to-day lead work happens on the CRM board.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Pipelines" },
    ],
  },
  "/business/settings/financial": {
    title: "Financial Settings",
    description:
      "Configure default invoice and estimate numbering, terms, and document display options.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Financial Settings" },
    ],
  },
  "/business/settings/templates": {
    title: "Templates",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Templates" },
    ],
  },
  "/business/settings/automations": {
    title: "Automations",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Automations" },
    ],
  },
  "/business/settings/chatbots": {
    title: "Chatbots",
    description:
      "Create and manage website chat widgets that capture visitors and conversations.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Chatbots" },
    ],
  },
  "/business/settings/billing": {
    title: "Plan & Billing",
    description:
      "Your subscription, plan tier, and payment status.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Plan & Billing" },
    ],
  },
  "/business/settings/integrations": {
    title: "Integrations",
    description:
      "Connect WhatsApp, SMS, email, calendar, payments, and other providers.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Integrations" },
    ],
  },
  "/business/settings/notifications": {
    title: "Notifications",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Notifications" },
    ],
  },
  "/business/settings/appearance": {
    title: "Appearance",
    description: "Theme and display preferences for your workspace.",
    breadcrumbs: [
      { label: "Settings", href: "/business/settings/profile" },
      { label: "Appearance" },
    ],
  },
};

const platformRoutes: Record<string, RouteEntry> = {
  "/platform/dashboard": {
    title: "Platform Dashboard",
    description: "Overview of businesses, revenue, and usage.",
  },
  "/platform/businesses": {
    title: "Businesses",
    description: "Manage tenant businesses.",
  },
  "/platform/industries": {
    title: "Industries",
    description: "Industry metadata for business classification.",
  },
  "/platform/snapshots": {
    title: "Snapshots",
    description: "Reusable business blueprints for navigation, terminology, and provisioning.",
  },
  "/platform/users": {
    title: "Users",
    description: "Platform and business user accounts.",
  },
  "/platform/plan-groups": {
    title: "Plan Groups",
    description:
      "Pricing table builder with tiers, capability assignments, comparison rows, and embeddable public pricing.",
  },
  "/platform/audit-logs": {
    title: "Audit Logs",
    description: "Security and activity audit trail.",
  },
  "/platform/capabilities": {
    title: "Capabilities",
    description:
      "Platform-level software capabilities—CRM, messaging, automation, and more.",
  },
  "/platform/settings": {
    title: "Platform Settings",
    description: "Platform-wide configuration.",
  },
  "/platform/settings/integrations": {
    title: "Platform Integrations",
    description: "Configure platform-wide AI, messaging, storage, and OAuth providers.",
  },
};

const businessTerminologyKeys: Partial<Record<string, string>> = {
  "/business/contacts": "nav.contacts",
  "/business/work-items": "nav.workItems",
  "/business/pipelines": "nav.pipelines",
  "/business/conversations": "nav.conversations",
  "/business/appointments": "nav.appointments",
};

function applyRouteTerminology(
  pathname: string,
  entry: RouteEntry,
  ctx: PageMetadataContext,
): RouteEntry {
  const termKey = businessTerminologyKeys[pathname];
  if (!termKey) return entry;
  return {
    ...entry,
    title: resolveTerminology(termKey, entry.title, ctx.terminology),
  };
}

export function resolvePageMetadata(
  pathname: string,
  ctx: PageMetadataContext,
): PageMetadata | null {
  if (ctx.settingsMode || isBusinessSettingsPath(pathname)) {
    const entry = businessRoutes[pathname];
    if (entry) {
      return {
        title: entry.title,
        description: entry.description,
        breadcrumbs: entry.breadcrumbs ?? [
          { label: "Settings", href: "/business/settings/profile" },
        ],
      };
    }
    if (pathname === "/business/settings") {
      return { title: "Settings" };
    }
  }

  const routes = ctx.mode === "platform" ? platformRoutes : businessRoutes;
  const entry = routes[pathname];
  if (entry) {
    const resolved =
      ctx.mode === "business" ? applyRouteTerminology(pathname, entry, ctx) : entry;
    return {
      title: resolved.title,
      description: resolved.description,
      breadcrumbs: resolved.breadcrumbs,
    };
  }

  if (pathname.match(/^\/platform\/businesses\/[^/]+$/)) {
    return {
      title: "Business",
      breadcrumbs: [
        { label: "Businesses", href: "/platform/businesses" },
        { label: "Details" },
      ],
    };
  }

  if (pathname.match(/^\/platform\/snapshots\/[^/]+$/)) {
    return {
      title: "Snapshot",
      breadcrumbs: [
        { label: "Snapshots", href: "/platform/snapshots" },
        { label: "Editor" },
      ],
    };
  }

  if (pathname.match(/^\/platform\/capabilities\/[^/]+$/)) {
    return {
      title: "Capability",
      breadcrumbs: [
        { label: "Capabilities", href: "/platform/capabilities" },
        { label: "Details" },
      ],
    };
  }

  if (pathname.match(/^\/platform\/plan-groups\/[^/]+$/)) {
    return {
      title: "Plan Group",
      breadcrumbs: [
        { label: "Plan Groups", href: "/platform/plan-groups" },
        { label: "Details" },
      ],
    };
  }

  if (pathname.match(/^\/business\/contacts\/[^/]+$/)) {
    const contactsLabel = resolveTerminology(
      "entities.contact.plural",
      "Contacts",
      ctx.terminology,
    );
    return {
      title: "Contact",
      description: "Contact workspace — profile, leads, work items, and more.",
      breadcrumbs: [
        { label: contactsLabel, href: "/business/contacts" },
        { label: "Details" },
      ],
    };
  }

  if (pathname.match(/^\/business\/settings\/calendars\/[^/]+\/edit$/)) {
    return {
      title: "Edit calendar",
      description: "Configure availability, booking rules, and integrations.",
      breadcrumbs: [
        { label: "Settings", href: "/business/settings/profile" },
        { label: "Calendars", href: "/business/settings/calendars" },
        { label: "Edit" },
      ],
    };
  }

  if (pathname.match(/^\/business\/settings\/chatbots\/[^/]+\/edit$/)) {
    return {
      title: "Edit chatbot",
      description: "Configure your website chat widget, replies, and embed code.",
      breadcrumbs: [
        { label: "Settings", href: "/business/settings/profile" },
        { label: "Chatbots", href: "/business/settings/chatbots" },
        { label: "Edit" },
      ],
    };
  }

  if (pathname.match(/^\/business\/settings\/pipelines\/[^/]+\/edit$/)) {
    return {
      title: "Edit pipeline",
      breadcrumbs: [
        { label: "Settings", href: "/business/settings/profile" },
        { label: "Pipelines", href: "/business/settings/pipelines" },
        { label: "Edit" },
      ],
    };
  }

  return null;
}
