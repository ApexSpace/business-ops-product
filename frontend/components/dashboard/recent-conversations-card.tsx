import Link from "next/link";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import type { DashboardRecentConversation } from "@/features/dashboard/types";
import { formatRelativeTime } from "@/lib/ui/relative-time";

function contactName(conversation: DashboardRecentConversation): string {
  return (
    conversation.contact?.displayName ??
    [conversation.contact?.firstName, conversation.contact?.lastName]
      .filter(Boolean)
      .join(" ") ??
    "Client"
  );
}

function initials(conversation: DashboardRecentConversation): string {
  return contactName(conversation)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function channelLabel(channel: DashboardRecentConversation["channel"]): string {
  switch (channel) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "FACEBOOK":
      return "Facebook";
    case "EMAIL":
      return "Email";
    case "SMS":
      return "SMS";
    case "WEBCHAT":
      return "Webchat";
    case "LINKEDIN":
      return "LinkedIn";
    default:
      return channel;
  }
}

function avatarTone(channel: DashboardRecentConversation["channel"]): string {
  switch (channel) {
    case "WHATSAPP":
      return "bg-primary/12 text-primary";
    case "INSTAGRAM":
      return "bg-[#fdf1e0] text-[#c88a12]";
    default:
      return "bg-[#e7f7ef] text-[#1f9d63]";
  }
}

interface RecentConversationsCardProps {
  title: string;
  description?: string;
  conversations: DashboardRecentConversation[];
}

export function RecentConversationsCard({
  title,
  description,
  conversations,
}: RecentConversationsCardProps) {
  return (
    <DashboardCardShell
      title={title}
      description={description}
      actionLabel="See all"
      actionHref="/business/conversations"
      contentClassName="px-4 pb-4 pt-3"
    >
      {conversations.length === 0 ? (
        <p className="px-3 py-8 text-sm text-muted-foreground">
          No recent client conversations in the last 7 days.
        </p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={conversation.href}
              className="glass-hover flex items-start gap-3 rounded-[12px] px-1 py-1 hover:bg-white/28 dark:hover:bg-white/6"
            >
              <div
                className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarTone(conversation.channel)}`}
              >
                {initials(conversation)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-[#12172b] dark:text-foreground">
                      {contactName(conversation)}{" "}
                      <span className="font-normal text-[11px] text-[#98a1b5]">
                        via {channelLabel(conversation.channel)}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[10.5px] text-[#98a1b5] sm:text-right">
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#5b6478] dark:text-muted-foreground">
                  {conversation.preview?.trim() || "No preview available yet."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
