"use client";

import { cn } from "@/lib/utils";
import type { Chatbot } from "@/features/chatbots/api/chatbots.api";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

interface ChatbotLivePreviewProps {
  bot: Chatbot;
  draft?: Partial<Chatbot>;
  device: PreviewDevice;
}

function previewConfig(bot: Chatbot, draft?: Partial<Chatbot>) {
  return {
    publicKey: bot.publicKey,
    widgetTitle: draft?.widgetTitle ?? bot.widgetTitle,
    welcomeMessage: draft?.welcomeMessage ?? bot.welcomeMessage,
    offlineMessage: draft?.offlineMessage ?? bot.offlineMessage,
    avatarUrl: draft?.avatarUrl ?? bot.avatarUrl,
    primaryColor: draft?.primaryColor ?? bot.primaryColor,
    position: draft?.position ?? bot.position,
    collectContactInfo: draft?.collectContactInfo ?? bot.collectContactInfo,
    requireName: draft?.requireName ?? bot.requireName,
    requireEmail: draft?.requireEmail ?? bot.requireEmail,
    requirePhone: draft?.requirePhone ?? bot.requirePhone,
    showNotesField: draft?.showNotesField ?? bot.showNotesField,
    allowAnonymous: draft?.allowAnonymous ?? bot.allowAnonymous,
    showBranding: draft?.showBranding ?? bot.showBranding,
    acknowledgementMessage: "We typically reply soon",
    businessName: "Your business",
  };
}

/** Preview uses public widget UI with mocked config (no live API in settings). */
export function ChatbotLivePreview({
  bot,
  draft,
  device,
}: ChatbotLivePreviewProps) {
  const frameClass =
    device === "desktop"
      ? "h-[520px] w-full max-w-[400px]"
      : device === "tablet"
        ? "h-[480px] w-[340px]"
        : "h-[440px] w-[280px]";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-muted/30 shadow-inner",
          frameClass,
        )}
      >
        <div className="absolute inset-0 scale-[0.98] origin-top">
          <PreviewFrame bot={bot} draft={draft} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground capitalize">{device} preview</p>
    </div>
  );
}

function PreviewFrame({
  bot,
  draft,
}: {
  bot: Chatbot;
  draft?: Partial<Chatbot>;
}) {
  const cfg = previewConfig(bot, draft);
  const positionClass =
    cfg.position === "BOTTOM_LEFT" ? "left-3" : "right-3";

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <p className="text-xs text-muted-foreground">Your website</p>
      <div
        className={cn(
          "absolute bottom-4 flex h-[min(420px,90%)] w-[min(320px,92%)] flex-col overflow-hidden rounded-2xl border bg-background shadow-xl",
          positionClass,
        )}
      >
        <header
          className="flex items-center gap-2 px-3 py-2 text-sm text-white"
          style={{ backgroundColor: cfg.primaryColor }}
        >
          <span className="font-semibold truncate">{cfg.widgetTitle}</span>
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-sm text-muted-foreground">
          {cfg.welcomeMessage}
        </div>
        {cfg.showBranding ? (
          <p className="border-t py-1 text-center text-[10px] text-muted-foreground">
            Powered by website chat
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Full interactive preview in a new tab (uses live public API). */
export function ChatbotPreviewLink({ widgetUrl }: { widgetUrl: string }) {
  return (
    <a
      href={widgetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline"
    >
      Open live preview
    </a>
  );
}
