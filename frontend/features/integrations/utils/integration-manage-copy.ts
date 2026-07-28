import type { InstagramAuthFlow } from "@/features/integrations/utils/integrations";

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
  syncingAssetsTitle?: string;
  syncingAssetsMessage?: string;
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
      "You'll sign in with Facebook and choose the Page linked to your Instagram Professional account so your team can manage Instagram conversations.",
    resourcesSectionLabel: "Instagram accounts",
    syncButtonLabel: "Sync Instagram accounts",
    syncSuccessToast: (count) =>
      count === 1
        ? "Instagram account synced"
        : `${count} Instagram accounts synced`,
    syncEmptyToast: "No Instagram account found",
    syncingAssetsTitle: "Finding linked Instagram accounts…",
    syncingAssetsMessage:
      "Meta is confirming which Instagram Professional accounts are linked to the Pages you selected.",
    emptyState: {
      title: "No Instagram account found",
      message:
        "We could not find an Instagram Professional account connected to the selected Facebook Page.",
      checklist: [
        "Your Instagram account must be Professional (Business or Creator).",
        "That Instagram account must be linked to a Facebook Page.",
        "You must be an admin of that Page.",
        "Select that Page in Meta's authorization dialog when reconnecting.",
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
      "Sign in with Facebook and choose every Page your team should manage for conversations and customer activity.",
    resourcesSectionLabel: "Facebook Pages",
    syncButtonLabel: "Sync Facebook Pages",
    syncSuccessToast: (count) =>
      count === 1 ? "Facebook Page synced" : `${count} Facebook Pages synced`,
    syncEmptyToast: "No Facebook Page found",
    syncingAssetsTitle: "Finding your Facebook Pages…",
    syncingAssetsMessage:
      "This usually takes a few seconds after you authorize Meta.",
    emptyState: {
      title: "No Facebook Page found",
      message:
        "We could not find a Facebook Page for this connection. Meta's Page picker is required for messaging.",
      checklist: [
        "You must be an admin of the Facebook Page.",
        "Select the Page during Facebook authorization (not just your profile).",
        "Reconnect Facebook if you changed permissions or skipped Pages.",
      ],
    },
    disconnectLabel: "Disconnect Facebook",
  },
  whatsapp: {
    connectionTitle: "WhatsApp connection",
    description:
      "Connect your existing WhatsApp Business app number. You will sign in with Meta, choose to connect your mobile app account, enter your number, and confirm in the WhatsApp Business app on your phone.",
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
  sms: {
    connectionTitle: "Twilio SMS",
    description:
      "Connect your Twilio account and phone number for two-way inbox SMS. Outbound notification texts (e.g. Express Booking links) use the CodeSol platform number automatically.",
    resourcesSectionLabel: "SMS number",
    syncButtonLabel: "Refresh SMS settings",
    syncSuccessToast: () => "SMS settings refreshed",
    syncEmptyToast: "No SMS number configured",
    emptyState: {
      title: "SMS not configured",
      message:
        "Enable platform SMS notifications or connect your Twilio number to start sending messages.",
      checklist: [
        "Enable platform SMS for one-way notifications.",
        "Connect your Twilio account for two-way inbox messaging.",
        "Configure the Twilio webhook URL on your number if needed.",
      ],
    },
    disconnectLabel: "Disconnect SMS",
    messagingComposerHint:
      "Two-way SMS replies are only available when your own Twilio number is connected.",
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

export function getIntegrationManageCopy(
  providerKey: string,
  options?: { authFlow?: InstagramAuthFlow },
): IntegrationManageCopy {
  if (providerKey === "instagram") {
    return getInstagramManageCopy(options?.authFlow ?? "FACEBOOK_LOGIN");
  }

  return COPY_BY_PROVIDER[providerKey] ?? {
    ...DEFAULT_COPY,
    connectionTitle: `${formatProviderName(providerKey)} connection`,
    resourcesSectionLabel: "Connected resources",
    disconnectLabel: `Disconnect ${formatProviderName(providerKey)}`,
  };
}

function getInstagramManageCopy(
  authFlow: InstagramAuthFlow,
): IntegrationManageCopy {
  if (authFlow === "INSTAGRAM_LOGIN") {
    return {
      connectionTitle: "Instagram connection",
      description:
        "Connected with Direct Instagram Login. Your team can manage Instagram conversations without a Facebook Page.",
      resourcesSectionLabel: "Instagram accounts",
      syncButtonLabel: "Sync Instagram accounts",
      syncSuccessToast: (count) =>
        count === 1
          ? "Instagram account synced"
          : `${count} Instagram accounts synced`,
      syncEmptyToast: "No Instagram account found",
      syncingAssetsTitle: "Loading your Instagram account…",
      syncingAssetsMessage:
        "Meta is confirming your Instagram Business or Creator profile.",
      emptyState: {
        title: "No Instagram account found",
        message:
          "We could not load an Instagram Business or Creator profile for this Direct connection.",
        checklist: [
          "Your Instagram account must be Professional (Business or Creator).",
          "Reconnect using Direct Instagram Integration and grant messaging permissions.",
          "Confirm the Meta app has Advanced Access for Instagram Login scopes.",
        ],
      },
      disconnectLabel: "Disconnect Instagram",
    };
  }

  return COPY_BY_PROVIDER.instagram;
}

function formatProviderName(providerKey: string): string {
  return providerKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInstagramConnectionMethodLabel(
  authFlow: InstagramAuthFlow | null | undefined,
): string | null {
  if (!authFlow) return null;
  return authFlow === "INSTAGRAM_LOGIN"
    ? "Connected via Instagram"
    : "Connected via Facebook";
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
