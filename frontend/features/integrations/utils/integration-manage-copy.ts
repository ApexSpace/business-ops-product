export interface IntegrationEmptyStateCopy {
  title: string;
  message: string;
  checklist: string[];
  learnMoreUrl?: string;
  learnMoreLabel?: string;
}

export interface IntegrationManageCopy {
  connectionTitle: string;
  description: string;
  resourcesSectionLabel: string;
  syncButtonLabel: string;
  syncSuccessToast: (count: number) => string;
  syncEmptyToast: string;
  emptyState: IntegrationEmptyStateCopy;
  disconnectLabel: string;
  messagingComposerHint?: string;
}

const DEFAULT_COPY: IntegrationManageCopy = {
  connectionTitle: "Integration connection",
  description:
    "Connect this integration so your team can use it across the platform.",
  resourcesSectionLabel: "Connected resources",
  syncButtonLabel: "Sync resources",
  syncSuccessToast: (count) =>
    count === 1 ? "Resource synced" : `${count} resources synced`,
  syncEmptyToast: "No resources found",
  emptyState: {
    title: "No resources found",
    message: "We could not find any resources for this connection.",
    checklist: [
      "Confirm you granted the required permissions during login.",
      "Try syncing again after reconnecting.",
    ],
  },
  disconnectLabel: "Disconnect",
};

const COPY_BY_PROVIDER: Record<string, IntegrationManageCopy> = {
  instagram: {
    connectionTitle: "Instagram connection",
    description:
      "Connect your Instagram Professional account so your team can manage Instagram conversations and customer activity from this platform.",
    resourcesSectionLabel: "Instagram accounts",
    syncButtonLabel: "Sync Instagram accounts",
    syncSuccessToast: (count) =>
      count === 1
        ? "Instagram account synced"
        : `${count} Instagram accounts synced`,
    syncEmptyToast: "No Instagram account found",
    emptyState: {
      title: "No Instagram account found",
      message:
        "We could not find an Instagram Professional account connected to the selected Facebook Page.",
      checklist: [
        "Your Instagram account must be Professional.",
        "Your Instagram account must be linked to a Facebook Page.",
        "You must be an admin of that Page.",
        "Select the correct Page when reconnecting Instagram.",
      ],
      learnMoreUrl:
        "https://www.facebook.com/business/help/898752960195806",
      learnMoreLabel: "Learn how to connect Instagram to a Facebook Page",
    },
    disconnectLabel: "Disconnect Instagram",
  },
  facebook: {
    connectionTitle: "Facebook connection",
    description:
      "Connect your Facebook Page so your team can manage Page conversations and customer activity.",
    resourcesSectionLabel: "Facebook Pages",
    syncButtonLabel: "Sync Facebook Pages",
    syncSuccessToast: (count) =>
      count === 1 ? "Facebook Page synced" : `${count} Facebook Pages synced`,
    syncEmptyToast: "No Facebook Page found",
    emptyState: {
      title: "No Facebook Page found",
      message: "We could not find a Facebook Page for this connection.",
      checklist: [
        "You must be an admin of the Facebook Page.",
        "Select the Page during Facebook authorization.",
        "Reconnect Facebook if you changed permissions.",
      ],
    },
    disconnectLabel: "Disconnect Facebook",
  },
  whatsapp: {
    connectionTitle: "WhatsApp connection",
    description:
      "Connect one WhatsApp Business number so your team can send and receive customer messages.",
    messagingComposerHint:
      "Free-form replies are allowed within 24 hours of the customer's last message. Outside that window, use an approved WhatsApp message template to start or continue the conversation.",
    resourcesSectionLabel: "WhatsApp numbers",
    syncButtonLabel: "Sync WhatsApp numbers",
    syncSuccessToast: (count) =>
      count === 1
        ? "WhatsApp number synced"
        : `${count} WhatsApp numbers synced`,
    syncEmptyToast: "No WhatsApp number found",
    emptyState: {
      title: "No WhatsApp number found",
      message: "We could not find a WhatsApp Business number for this connection.",
      checklist: [
        "Your WhatsApp Business Account must be connected.",
        "Your phone number must be available in the selected WhatsApp Business Account.",
        "Reconnect WhatsApp or sync numbers again.",
      ],
    },
    disconnectLabel: "Disconnect WhatsApp",
  },
  "google-calendar": {
    connectionTitle: "Google Calendar connection",
    description: "Connect Google Calendar to sync appointments.",
    resourcesSectionLabel: "Calendars",
    syncButtonLabel: "Sync calendars",
    syncSuccessToast: (count) =>
      count === 1 ? "Calendar synced" : `${count} calendars synced`,
    syncEmptyToast: "No calendar found",
    emptyState: {
      title: "No calendar found",
      message: "We could not find a calendar for this Google account.",
      checklist: [
        "Make sure you selected calendar permissions.",
        "Sync calendars again.",
      ],
    },
    disconnectLabel: "Disconnect Google Calendar",
  },
  "google-business-profile": {
    connectionTitle: "Google Business Profile connection",
    description:
      "Connect Google Business Profile so your team can manage locations and reviews.",
    resourcesSectionLabel: "Business profiles",
    syncButtonLabel: "Sync business profiles",
    syncSuccessToast: (count) =>
      count === 1
        ? "Business profile synced"
        : `${count} business profiles synced`,
    syncEmptyToast: "No business profile found",
    emptyState: {
      title: "No business profile found",
      message: "We could not find a Business Profile location for this account.",
      checklist: [
        "Confirm you granted Business Profile access during Google login.",
        "Wait about a minute between syncs, then try again.",
      ],
    },
    disconnectLabel: "Disconnect Google Business Profile",
  },
  stripe: {
    connectionTitle: "Stripe connection",
    description:
      "Connect your Stripe account so your business can accept online payments and invoice checkout.",
    resourcesSectionLabel: "Payment account",
    syncButtonLabel: "Sync account",
    syncSuccessToast: () => "Stripe account synced",
    syncEmptyToast: "No Stripe account found",
    emptyState: {
      title: "No Stripe account found",
      message: "We could not find a connected Stripe account.",
      checklist: [
        "Complete Stripe authorization when connecting.",
        "Try syncing again after reconnecting Stripe.",
      ],
    },
    disconnectLabel: "Disconnect Stripe",
  },
  email: {
    connectionTitle: "Email for conversations",
    description:
      "Conversation email is enabled on CodeSol's shared domain by default. Customers can reply to your messages and those replies appear in your inbox.",
    resourcesSectionLabel: "Email address",
    syncButtonLabel: "Refresh email address",
    syncSuccessToast: () => "Email address refreshed",
    syncEmptyToast: "No email address found",
    emptyState: {
      title: "No email address",
      message: "Platform email has not been activated for this business yet.",
      checklist: [
        "Ensure EMAIL_ENABLED and RESEND_API_KEY are set on the server.",
        "Open this screen again to activate the shared address.",
      ],
    },
    disconnectLabel: "Disconnect email",
    messagingComposerHint:
      "Replies from customers are routed back to this conversation automatically.",
  },
  linkedin: {
    connectionTitle: "LinkedIn connection",
    description:
      "Connect LinkedIn so your business can use LinkedIn account features in the platform.",
    resourcesSectionLabel: "LinkedIn account",
    syncButtonLabel: "Sync LinkedIn account",
    syncSuccessToast: () => "LinkedIn account synced",
    syncEmptyToast: "No LinkedIn resource found",
    emptyState: {
      title: "No LinkedIn resource found",
      message: "We could not find a LinkedIn resource for this connection.",
      checklist: [
        "Confirm you completed LinkedIn authorization.",
        "Try syncing again after reconnecting.",
      ],
    },
    disconnectLabel: "Disconnect LinkedIn",
  },
};

export function getIntegrationManageCopy(providerKey: string): IntegrationManageCopy {
  return COPY_BY_PROVIDER[providerKey] ?? {
    ...DEFAULT_COPY,
    connectionTitle: `${formatProviderName(providerKey)} connection`,
    resourcesSectionLabel: "Connected resources",
    disconnectLabel: `Disconnect ${formatProviderName(providerKey)}`,
  };
}

function formatProviderName(providerKey: string): string {
  return providerKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** User-facing webhook label; raw status stays in advanced details. */
export function formatWebhookStatusForBusiness(
  webhookStatus: string | null | undefined,
): "Ready" | "Needs setup" | "Not available yet" | null {
  if (!webhookStatus) return null;
  const lower = webhookStatus.toLowerCase();
  if (lower.includes("endpoint configured") || lower.includes("ready")) {
    return "Ready";
  }
  if (
    lower.includes("not implemented") ||
    lower.includes("not available")
  ) {
    return "Not available yet";
  }
  return "Needs setup";
}
