import {
  CalendarClock,
  CreditCard,
  Gift,
  MessageCircleMore,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { BusinessNicheProfile } from "./types";

export const MEDSPA_BUSINESS_NICHE_PROFILE: BusinessNicheProfile = {
  key: "medspa",
  label: "Medspa",
  shell: {
    searchPlaceholder: "Search clients, appointments...",
  },
  dashboard: {
    heroLabel: "Today's revenue",
    heroEyebrow: "Front desk pulse",
    heroTitle: "Keep today's treatments, follow-ups, and conversations flowing.",
    heroDescription:
      "A tablet-first dashboard for coordinators and providers to manage confirmations, client communication, and daily revenue at a glance.",
    kpiWidgetKeys: ["appointments", "contacts", "conversations", "teamMembers"],
    kpiLabels: {
      appointments: "Today's appointments",
      contacts: "Client profiles",
      conversations: "Open conversations",
      teamMembers: "Active staff",
    },
    appointmentsToConfirmTitle: "Appointments to confirm",
    appointmentsToConfirmDescription:
      "The next scheduled bookings that still need front-desk confirmation.",
    recentConversationsTitle: "Recent conversations",
    recentConversationsDescription:
      "The latest client messages across your highest-priority channels.",
    revenueByCategoryTitle: "Revenue by category",
    bookingsBySourceTitle: "Bookings by channel",
    scheduleTitle: "My schedule",
    followUpsTitle: "Follow-ups",
    staffAssignmentsTitle: "Assigned to staff",
    quickActionsTitle: "Quick actions",
    quickActions: [
      {
        id: "book-appointment",
        label: "Book appointment",
        href: "/business/appointments?action=create",
        icon: CalendarClock,
      },
      {
        id: "new-client",
        label: "New client",
        href: "/business/contacts?action=create",
        icon: UserPlus,
      },
      {
        id: "message-client",
        label: "Open inbox",
        href: "/business/conversations",
        icon: MessageCircleMore,
      },
      {
        id: "membership",
        label: "Memberships",
        href: "/business/memberships",
        icon: Sparkles,
      },
      {
        id: "take-payment",
        label: "Take payment",
        href: "/business/payments?tab=transactions&action=create",
        icon: CreditCard,
      },
      {
        id: "gift-card",
        label: "Gift cards",
        href: "/business/gift-cards",
        icon: Gift,
      },
    ],
  },
};

export const DEFAULT_BUSINESS_NICHE_PROFILE = MEDSPA_BUSINESS_NICHE_PROFILE;
