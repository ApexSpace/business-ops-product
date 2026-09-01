"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsTextareaSection } from "@/components/layout/settings-textarea-section";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import {
  activateChatbot,
  disableChatbot,
  getChatbotEmbed,
  updateChatbot,
  type Chatbot,
} from "@/features/chatbots/api/chatbots.api";
import { useDefaultChatbot } from "@/features/chatbots/hooks/use-default-chatbot";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  invalidateChatbotDefault,
  invalidateChatbotDetail,
  invalidateChatbotLists,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

function isWebChatEnabled(bot: Chatbot): boolean {
  return bot.status === "ACTIVE" && bot.embedEnabled;
}

export function WebChatSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data: bot, isLoading, isError, error } = useDefaultChatbot();

  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [outsideHoursOnly, setOutsideHoursOnly] = useState(false);
  const [savedOutsideHoursOnly, setSavedOutsideHoursOnly] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState("");
  const [savedOfflineMessage, setSavedOfflineMessage] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [savedWelcomeMessage, setSavedWelcomeMessage] = useState("");
  const [acknowledgementMessage, setAcknowledgementMessage] = useState("");
  const [savedAcknowledgementMessage, setSavedAcknowledgementMessage] =
    useState("");
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);
  const [savedLiveChatEnabled, setSavedLiveChatEnabled] = useState(true);

  useEffect(() => {
    if (!bot) return;
    const nextEnabled = isWebChatEnabled(bot);
    setEnabled(nextEnabled);
    setSavedEnabled(nextEnabled);
    setOutsideHoursOnly(bot.businessHoursOnly);
    setSavedOutsideHoursOnly(bot.businessHoursOnly);
    setOfflineMessage(bot.offlineMessage);
    setSavedOfflineMessage(bot.offlineMessage);
    setWelcomeMessage(bot.welcomeMessage);
    setSavedWelcomeMessage(bot.welcomeMessage);
    setAcknowledgementMessage(
      bot.acknowledgementMessage ?? "We typically reply soon",
    );
    setSavedAcknowledgementMessage(
      bot.acknowledgementMessage ?? "We typically reply soon",
    );
    setLiveChatEnabled(bot.liveChatEnabled ?? true);
    setSavedLiveChatEnabled(bot.liveChatEnabled ?? true);
  }, [bot]);

  const { data: embed } = useQuery({
    queryKey: queryKeys.chatbots.embed("chatbots", bot?.id ?? ""),
    queryFn: () => getChatbotEmbed(bot!.id),
    enabled: Boolean(bot?.id),
  });

  const invalidateAll = useCallback(
    (chatbotId: string) => {
      void invalidateChatbotDefault(queryClient);
      void invalidateChatbotDetail(queryClient, chatbotId);
      void invalidateChatbotLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chatbots.embed("chatbots", chatbotId),
      });
    },
    [queryClient],
  );

  const enableMutation = useMutation({
    mutationFn: async ({
      chatbotId,
      nextEnabled,
    }: {
      chatbotId: string;
      nextEnabled: boolean;
    }) => {
      if (nextEnabled) {
        await updateChatbot(chatbotId, { embedEnabled: true });
        return activateChatbot(chatbotId);
      }
      return disableChatbot(chatbotId);
    },
    onSuccess: (updated, { nextEnabled }) => {
      setSavedEnabled(nextEnabled);
      setEnabled(nextEnabled);
      invalidateAll(updated.id);
      toast.success(nextEnabled ? "Web chat enabled" : "Web chat disabled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      chatbotId,
      body,
    }: {
      chatbotId: string;
      body: Parameters<typeof updateChatbot>[1];
    }) => updateChatbot(chatbotId, body),
    onSuccess: (updated) => {
      invalidateAll(updated.id);
      toast.success("Saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sectionSaving = useMemo(
    () => ({
      enable: enableMutation.isPending,
      outsideHours: patchMutation.isPending,
      offline: patchMutation.isPending,
      welcome: patchMutation.isPending,
      acknowledgement: patchMutation.isPending,
      livePreview: patchMutation.isPending,
    }),
    [enableMutation.isPending, patchMutation.isPending],
  );

  if (isLoading) {
    return <LoadingState variant="inline" label="Loading web chat settings…" />;
  }

  if (isError || !bot) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Unable to load web chat settings."}
      </p>
    );
  }

  const advancedHref = `/business/settings/chatbots/${bot.id}/edit`;

  return (
    <SettingsFormPage>
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="web-chat-enabled"
          title="Enable web chat"
          description="Show the chat widget on your website so visitors can message you."
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={!canEdit}
          isDirty={enabled !== savedEnabled}
          isSaving={sectionSaving.enable}
          onDiscard={() => setEnabled(savedEnabled)}
          onSave={() =>
            enableMutation.mutate({ chatbotId: bot.id, nextEnabled: enabled })
          }
        />

        <SettingsToggleSection
          id="web-chat-outside-hours"
          title="Outside business hours"
          description={
            <>
              When enabled, visitors see your offline message outside scheduled
              hours. Manage your schedule on the{" "}
              <Link
                href="/business/settings/business-hours"
                className="text-primary underline-offset-4 hover:underline"
              >
                Business Hours
              </Link>{" "}
              page.
            </>
          }
          checked={outsideHoursOnly}
          onCheckedChange={setOutsideHoursOnly}
          disabled={!canEdit}
          isDirty={outsideHoursOnly !== savedOutsideHoursOnly}
          isSaving={sectionSaving.outsideHours}
          onDiscard={() => setOutsideHoursOnly(savedOutsideHoursOnly)}
          onSave={() =>
            patchMutation.mutate(
              {
                chatbotId: bot.id,
                body: { businessHoursOnly: outsideHoursOnly },
              },
              {
                onSuccess: (updated) => {
                  setSavedOutsideHoursOnly(updated.businessHoursOnly);
                  setOutsideHoursOnly(updated.businessHoursOnly);
                },
              },
            )
          }
        />

        <SettingsTextareaSection
          id="web-chat-offline-message"
          title="Outside business hours message"
          description="Shown when chat is unavailable outside your business hours."
          value={offlineMessage}
          onChange={setOfflineMessage}
          disabled={!canEdit}
          isDirty={offlineMessage !== savedOfflineMessage}
          isSaving={sectionSaving.offline}
          onDiscard={() => setOfflineMessage(savedOfflineMessage)}
          onSave={() =>
            patchMutation.mutate(
              {
                chatbotId: bot.id,
                body: { offlineMessage },
              },
              {
                onSuccess: (updated) => {
                  setSavedOfflineMessage(updated.offlineMessage);
                  setOfflineMessage(updated.offlineMessage);
                },
              },
            )
          }
        />

        <SettingsTextareaSection
          id="web-chat-welcome-message"
          title="Welcome message"
          description="The first message visitors see when they open the chat widget."
          value={welcomeMessage}
          onChange={setWelcomeMessage}
          disabled={!canEdit}
          isDirty={welcomeMessage !== savedWelcomeMessage}
          isSaving={sectionSaving.welcome}
          onDiscard={() => setWelcomeMessage(savedWelcomeMessage)}
          onSave={() =>
            patchMutation.mutate(
              {
                chatbotId: bot.id,
                body: { welcomeMessage },
              },
              {
                onSuccess: (updated) => {
                  setSavedWelcomeMessage(updated.welcomeMessage);
                  setWelcomeMessage(updated.welcomeMessage);
                },
              },
            )
          }
        />

        <SettingsTextareaSection
          id="web-chat-acknowledgement-message"
          title="Estimated response time message"
          description="Reassures visitors about how quickly your team typically replies."
          value={acknowledgementMessage}
          onChange={setAcknowledgementMessage}
          disabled={!canEdit}
          isDirty={acknowledgementMessage !== savedAcknowledgementMessage}
          isSaving={sectionSaving.acknowledgement}
          onDiscard={() =>
            setAcknowledgementMessage(savedAcknowledgementMessage)
          }
          onSave={() =>
            patchMutation.mutate(
              {
                chatbotId: bot.id,
                body: { acknowledgementMessage },
              },
              {
                onSuccess: (updated) => {
                  const next =
                    updated.acknowledgementMessage ?? acknowledgementMessage;
                  setSavedAcknowledgementMessage(next);
                  setAcknowledgementMessage(next);
                },
              },
            )
          }
        />

        <SettingsToggleSection
          id="web-chat-live-previews"
          title="Live message previews"
          description="Show a typing-style preview while your team is composing a reply."
          checked={liveChatEnabled}
          onCheckedChange={setLiveChatEnabled}
          disabled={!canEdit}
          isDirty={liveChatEnabled !== savedLiveChatEnabled}
          isSaving={sectionSaving.livePreview}
          onDiscard={() => setLiveChatEnabled(savedLiveChatEnabled)}
          onSave={() =>
            patchMutation.mutate(
              {
                chatbotId: bot.id,
                body: { liveChatEnabled },
              },
              {
                onSuccess: (updated) => {
                  const next = updated.liveChatEnabled ?? liveChatEnabled;
                  setSavedLiveChatEnabled(next);
                  setLiveChatEnabled(next);
                },
              },
            )
          }
        />

        <section className={SETTINGS_FORM_SECTION_STACK_CLASS}>
          <div className="min-w-0 space-y-[var(--spacing-2)]">
            <h2 className="text-base font-medium">Website integration</h2>
            <p className="settings-form-description max-w-2xl">
              Copy this snippet into your site&apos;s HTML before the closing{" "}
              <code className="text-sm">&lt;/body&gt;</code> tag.
            </p>
            {embed ? (
              <pre className="max-h-48 overflow-auto rounded-[var(--radius-control)] border bg-muted/40 p-[var(--spacing-3)] text-xs whitespace-pre-wrap break-all">
                {embed.embedCode ?? embed.embedScript}
              </pre>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading embed code…
              </div>
            )}
            <div className="flex flex-wrap gap-[var(--spacing-2)]">
              <Button
                type="button"
                variant="outline"
                disabled={!embed}
                onClick={() => {
                  void navigator.clipboard.writeText(
                    embed?.embedCode ?? embed?.embedScript ?? "",
                  );
                  toast.success("Embed code copied");
                }}
              >
                <Copy className="mr-2 size-4" />
                Copy embed code
              </Button>
              <Link
                href={advancedHref}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <ExternalLink className="mr-2 size-4" />
                Advanced settings
              </Link>
            </div>
          </div>
        </section>

        {!canEdit ? (
          <p className="text-sm text-muted-foreground">
            Only owners, admins, and platform administrators can edit web chat
            settings.
          </p>
        ) : null}
      </div>
    </SettingsFormPage>
  );
}
