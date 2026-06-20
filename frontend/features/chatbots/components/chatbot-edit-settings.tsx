"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Loader2,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/layout/settings-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormOptionalSection } from "@/components/forms/form-optional-section";
import {
  activateChatbot,
  chatbotStatusLabel,
  deleteChatbot,
  disableChatbot,
  getChatbot,
  getChatbotEmbed,
  listChatbotRules,
  updateChatbot,
  type Chatbot,
} from "@/features/chatbots/api/chatbots.api";
import {
  ChatbotLivePreview,
  ChatbotPreviewLink,
  type PreviewDevice,
} from "@/features/chatbots/components/chatbot-live-preview";
import { ChatbotBusinessHoursEditor } from "@/features/chatbots/components/chatbot-business-hours-editor";
import { ChatbotRulesEditor } from "@/features/chatbots/components/chatbot-rules-editor";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import type { ChatbotWelcomeVariant } from "@/features/chatbots/api/chatbots.api";
import {
  normalizeBusinessHoursSettings,
} from "@/features/chatbots/utils/chatbot-business-hours.util";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

interface ChatbotEditSettingsProps {
  chatbotId: string;
}

export function ChatbotEditSettings({ chatbotId }: ChatbotEditSettingsProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("styles");
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const { data: bot, isLoading } = useQuery({
    queryKey: queryKeys.chatbots.detail(chatbotId),
    queryFn: () => getChatbot(chatbotId),
  });

  const { data: rules = [] } = useQuery({
    queryKey: queryKeys.chatbots.rules(chatbotId),
    queryFn: () => listChatbotRules(chatbotId),
    enabled: Boolean(bot),
  });

  const { data: embed } = useQuery({
    queryKey: queryKeys.chatbots.embed(chatbotId),
    queryFn: () => getChatbotEmbed(chatbotId),
    enabled: Boolean(bot),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.chatbots.detail(chatbotId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.chatbots.all() });
  };

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateChatbot>[1]) =>
      updateChatbot(chatbotId, body),
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !bot) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <ChatbotEditForm
      bot={bot}
      chatbotId={chatbotId}
      tab={tab}
      setTab={setTab}
      device={device}
      setDevice={setDevice}
      rules={rules}
      embed={embed}
      saveMutation={saveMutation}
      invalidate={invalidate}
    />
  );
}

function ChatbotEditForm({
  bot,
  chatbotId,
  tab,
  setTab,
  device,
  setDevice,
  rules,
  embed,
  saveMutation,
  invalidate,
}: {
  bot: Chatbot;
  chatbotId: string;
  tab: string;
  setTab: (v: string) => void;
  device: PreviewDevice;
  setDevice: (v: PreviewDevice) => void;
  rules: Awaited<ReturnType<typeof listChatbotRules>>;
  embed: Awaited<ReturnType<typeof getChatbotEmbed>> | undefined;
  saveMutation: ReturnType<
    typeof useMutation<unknown, Error, Parameters<typeof updateChatbot>[1]>
  >;
  invalidate: () => void;
}) {
  const { data: business } = useCurrentBusiness();
  const [draft, setDraft] = useState<Partial<Chatbot>>({});
  const [consentOpen, setConsentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const defaultTimezone = business?.timezone ?? "UTC";
  const resolvedBusinessHours = normalizeBusinessHoursSettings(
    draft.businessHoursSettings ?? bot.businessHoursSettings,
    defaultTimezone,
  );

  const str = (key: keyof Chatbot) =>
    (draft[key] as string | undefined) ?? (bot[key] as string);

  const bool = (key: keyof Chatbot) =>
    (draft[key] as boolean | undefined) ?? (bot[key] as boolean);

  const setField = <K extends keyof Chatbot>(key: K, v: Chatbot[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const flush = () => {
    if (Object.keys(draft).length === 0) return;
    saveMutation.mutate(draft as Parameters<typeof updateChatbot>[1]);
    setDraft({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/business/settings/chatbots"
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold">{bot.name}</h2>
            <Badge className="mt-1">{chatbotStatusLabel(bot.status)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {embed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    embed.embedCode ?? embed.embedScript,
                  );
                  toast.success("Embed code copied");
                }}
              >
                <Copy className="mr-2 size-4" />
                Copy embed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(embed.widgetUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="mr-2 size-4" />
                Preview
              </Button>
            </>
          ) : null}
          {bot.status !== "ACTIVE" ? (
            <Button size="sm" onClick={() => activateChatbot(chatbotId).then(invalidate)}>
              Activate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => disableChatbot(chatbotId).then(invalidate)}
            >
              Disable
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="styles">Styles</TabsTrigger>
              <TabsTrigger value="window">Chat Window</TabsTrigger>
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
            </TabsList>

            <TabsContent value="styles" className="mt-4 space-y-4">
              <SettingsCard title="Placement & appearance">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={str("name")}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Placement</Label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={str("position")}
                      onChange={(e) =>
                        setField(
                          "position",
                          e.target.value as typeof bot.position,
                        )
                      }
                    >
                      <option value="BOTTOM_RIGHT">Bottom right</option>
                      <option value="BOTTOM_LEFT">Bottom left</option>
                    </select>
                  </div>
                  <div>
                    <Label>Primary color</Label>
                    <Input
                      type="color"
                      value={str("primaryColor")}
                      onChange={(e) => setField("primaryColor", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Avatar URL</Label>
                    <Input
                      value={str("avatarUrl") || ""}
                      placeholder="https://…"
                      onChange={(e) =>
                        setField("avatarUrl", e.target.value || null)
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Label>Show branding</Label>
                  <Checkbox
                    checked={bool("showBranding")}
                    onCheckedChange={(v) =>
                      setField("showBranding", v === true)
                    }
                  />
                </div>
                <Button className="mt-4" onClick={flush} disabled={saveMutation.isPending}>
                  Save styles
                </Button>
              </SettingsCard>

              <FormOptionalSection
                label="Consent banner"
                open={consentOpen}
                onOpenChange={setConsentOpen}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Show consent before chat opens</Label>
                    <Checkbox
                      checked={bool("consentEnabled")}
                      onCheckedChange={(v) =>
                        setField("consentEnabled", v === true)
                      }
                    />
                  </div>
                  <div>
                    <Label>Consent text</Label>
                    <Textarea
                      value={str("consentText")}
                      onChange={(e) => setField("consentText", e.target.value)}
                      rows={3}
                      placeholder="Privacy notice shown before the visitor starts chatting"
                    />
                  </div>
                </div>
              </FormOptionalSection>

              <SettingsCard title="Embed security" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Label>Allowed domains (one per line)</Label>
                    <Textarea
                      value={
                        (draft.allowedDomains as string[] | undefined)?.join(
                          "\n",
                        ) ??
                        bot.allowedDomains?.join("\n") ??
                        ""
                      }
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          allowedDomains: e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        }))
                      }
                      rows={4}
                      placeholder={"example.com\nwww.example.com"}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave empty to allow all domains. Visitors must load the
                      widget from a matching hostname.
                    </p>
                  </div>
                  <div>
                    <Label>Launcher icon</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={str("launcherIcon") || "message"}
                      onChange={(e) =>
                        setField(
                          "launcherIcon",
                          e.target.value as "message" | "chat" | "help",
                        )
                      }
                    >
                      <option value="message">Message</option>
                      <option value="chat">Chat</option>
                      <option value="help">Help</option>
                    </select>
                  </div>
                </div>
                <Button className="mt-4" onClick={flush} disabled={saveMutation.isPending}>
                  Save embed settings
                </Button>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="window" className="mt-4 space-y-4">
              <SettingsCard title="Chat window">
                <div className="space-y-4">
                  <div>
                    <Label>Widget title</Label>
                    <Input
                      value={str("widgetTitle")}
                      onChange={(e) => setField("widgetTitle", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Intro message</Label>
                    <Textarea
                      value={str("welcomeMessage")}
                      onChange={(e) => setField("welcomeMessage", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Offline message</Label>
                    <Textarea
                      value={str("offlineMessage")}
                      onChange={(e) => setField("offlineMessage", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Handoff message</Label>
                    <Textarea
                      value={str("handoffMessage")}
                      onChange={(e) => setField("handoffMessage", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Contact form</p>
                  {(
                    [
                      ["collectContactInfo", "Collect visitor details"],
                      ["requireName", "Require name"],
                      ["requireEmail", "Require email"],
                      ["requirePhone", "Require phone"],
                      ["showNotesField", "Show notes field"],
                      ["allowAnonymous", "Allow anonymous chat"],
                      ["collectPhoneWhenOffline", "Require phone when offline"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Checkbox
                        checked={bool(key)}
                        onCheckedChange={(v) => setField(key, v === true)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Progressive profiling</p>
                  <div className="flex items-center justify-between">
                    <Label>Ask for email mid-chat if missing</Label>
                    <Checkbox
                      checked={
                        (draft.progressiveProfilingEnabled as boolean | undefined) ??
                        bot.progressiveProfilingEnabled ??
                        false
                      }
                      onCheckedChange={(v) =>
                        setField("progressiveProfilingEnabled", v === true)
                      }
                    />
                  </div>
                  <div>
                    <Label>Ask after this many visitor messages</Label>
                    <Input
                      type="number"
                      min={1}
                      className="mt-1 w-32"
                      value={
                        (draft.progressiveProfilingAskAfterMessages as number | undefined) ??
                        bot.progressiveProfilingAskAfterMessages ??
                        2
                      }
                      onChange={(e) =>
                        setField(
                          "progressiveProfilingAskAfterMessages",
                          Number(e.target.value) || 2,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Prompt message</Label>
                    <Textarea
                      className="mt-1"
                      rows={2}
                      placeholder="What's the best email to reach you?"
                      value={
                        (draft.progressiveProfilingPromptMessage as string | undefined) ??
                        bot.progressiveProfilingPromptMessage ??
                        ""
                      }
                      onChange={(e) =>
                        setField("progressiveProfilingPromptMessage", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={flush}>
                  Save chat window
                </Button>
              </SettingsCard>

              <SettingsCard title="Proactive welcome messages">
                <p className="text-sm text-muted-foreground">
                  Show different welcome messages based on page URL or referrer.
                </p>
                <WelcomeVariantsEditor
                  variants={
                    (draft.welcomeVariants as ChatbotWelcomeVariant[] | undefined) ??
                    bot.welcomeVariants ??
                    []
                  }
                  onChange={(welcomeVariants) =>
                    setDraft((d) => ({ ...d, welcomeVariants }))
                  }
                />
                <Button className="mt-4" onClick={flush}>
                  Save welcome variants
                </Button>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="messaging" className="mt-4 space-y-4">
              <SettingsCard title="Business hours">
                <ChatbotBusinessHoursEditor
                  settings={resolvedBusinessHours}
                  businessHoursOnly={bool("businessHoursOnly")}
                  defaultTimezone={defaultTimezone}
                  onChange={(settings, businessHoursOnly) => {
                    setDraft((d) => ({
                      ...d,
                      businessHoursSettings: settings,
                      businessHoursOnly,
                    }));
                  }}
                />
                <Button
                  className="mt-4"
                  onClick={flush}
                  disabled={saveMutation.isPending}
                >
                  Save hours
                </Button>
              </SettingsCard>

              <SettingsCard title="Bot rules">
                <div className="flex items-center justify-between">
                  <Label>Automatic replies</Label>
                  <Checkbox
                    checked={bool("autoReplyEnabled")}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setField("autoReplyEnabled", on);
                      saveMutation.mutate({ autoReplyEnabled: on });
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between opacity-60">
                  <Label>AI replies</Label>
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                </div>
                <div className="mt-4">
                  <Label>Fallback message</Label>
                  <Textarea
                    className="mt-1"
                    value={str("fallbackMessage")}
                    onChange={(e) => setField("fallbackMessage", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="mt-4">
                  <ChatbotRulesEditor
                    chatbotId={chatbotId}
                    rules={rules}
                    onChanged={invalidate}
                  />
                </div>
                <Button className="mt-4" variant="outline" onClick={flush}>
                  Save messaging
                </Button>
              </SettingsCard>

              <SettingsCard title="Embed">
                {embed ? (
                  <div className="space-y-2">
                    <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                      {embed.embedCode ?? embed.embedScript}
                    </pre>
                    {embed.widgetUrl ? (
                      <ChatbotPreviewLink widgetUrl={embed.widgetUrl} />
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <Label>Embed enabled</Label>
                  <Checkbox
                    checked={bool("embedEnabled")}
                    onCheckedChange={(v) => setField("embedEnabled", v === true)}
                  />
                </div>
              </SettingsCard>

              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete chatbot
                </Button>
              </div>
              <ConfirmDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete chatbot?"
                description="This chatbot will be archived and removed from your list."
                onConfirm={async () => {
                  await deleteChatbot(chatbotId);
                  window.location.href = "/business/settings/chatbots";
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex justify-center gap-1 rounded-lg border p-1">
            {(
              [
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ] as const
            ).map(([d, Icon]) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs",
                  device === d ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" />
                <span className="capitalize">{d}</span>
              </button>
            ))}
          </div>
          <ChatbotLivePreview bot={bot} draft={draft} device={device} />
        </aside>
      </div>
    </div>
  );
}

function WelcomeVariantsEditor({
  variants,
  onChange,
}: {
  variants: ChatbotWelcomeVariant[];
  onChange: (variants: ChatbotWelcomeVariant[]) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {variants.map((variant, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={variant.matchType}
            onChange={(e) => {
              const next = [...variants];
              next[index] = {
                ...variant,
                matchType: e.target.value as ChatbotWelcomeVariant["matchType"],
              };
              onChange(next);
            }}
          >
            <option value="page_url">Page URL contains</option>
            <option value="referrer">Referrer contains</option>
          </select>
          <Input
            placeholder="Pattern (e.g. /pricing or *google*)"
            value={variant.pattern}
            onChange={(e) => {
              const next = [...variants];
              next[index] = { ...variant, pattern: e.target.value };
              onChange(next);
            }}
          />
          <Textarea
            placeholder="Welcome message for this match"
            value={variant.message}
            rows={2}
            onChange={(e) => {
              const next = [...variants];
              next[index] = { ...variant, message: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(variants.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([
            ...variants,
            { matchType: "page_url", pattern: "", message: "" },
          ])
        }
      >
        <Plus className="mr-1 size-4" />
        Add variant
      </Button>
    </div>
  );
}
