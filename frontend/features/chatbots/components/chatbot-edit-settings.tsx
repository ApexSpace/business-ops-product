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
  Trash2,
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
  createChatbotRule,
  deleteChatbot,
  deleteChatbotRule,
  disableChatbot,
  getChatbot,
  getChatbotEmbed,
  listChatbotRules,
  updateChatbot,
  type Chatbot,
  type ChatbotRuleTriggerType,
} from "@/features/chatbots/api/chatbots.api";
import {
  ChatbotLivePreview,
  ChatbotPreviewLink,
  type PreviewDevice,
} from "@/features/chatbots/components/chatbot-live-preview";
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
  const [draft, setDraft] = useState<Partial<Chatbot>>({});
  const [consentOpen, setConsentOpen] = useState(false);

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
                <p className="text-sm text-muted-foreground">
                  Optional cookie or privacy notice before the widget opens (coming
                  soon).
                </p>
              </FormOptionalSection>
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
                <Button className="mt-4" onClick={flush}>
                  Save chat window
                </Button>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="messaging" className="mt-4 space-y-4">
              <SettingsCard title="Business hours">
                <div className="flex items-center justify-between">
                  <Label>Only accept messages during business hours</Label>
                  <Checkbox
                    checked={bool("businessHoursOnly")}
                    onCheckedChange={(v) => {
                      setField("businessHoursOnly", v === true);
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Configure detailed schedules in a future release.
                </p>
                <Button className="mt-4" onClick={flush}>
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
                <ul className="mt-4 divide-y">
                  {rules.map((rule) => (
                    <li key={rule.id} className="py-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <div>
                          <Badge variant="outline">{rule.triggerType}</Badge>
                          <p className="mt-1 font-medium">{rule.triggerText}</p>
                          <p className="text-muted-foreground">
                            {rule.responseText}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            deleteChatbotRule(chatbotId, rule.id).then(invalidate)
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <AddRuleForm chatbotId={chatbotId} onAdded={invalidate} />
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
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this chatbot?")) {
                      deleteChatbot(chatbotId).then(() => {
                        window.location.href = "/business/settings/chatbots";
                      });
                    }
                  }}
                >
                  Delete chatbot
                </Button>
              </div>
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

function AddRuleForm({
  chatbotId,
  onAdded,
}: {
  chatbotId: string;
  onAdded: () => void;
}) {
  const [triggerType, setTriggerType] =
    useState<ChatbotRuleTriggerType>("CONTAINS");
  const [triggerText, setTriggerText] = useState("");
  const [responseText, setResponseText] = useState("");

  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Add rule</p>
      <select
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={triggerType}
        onChange={(e) =>
          setTriggerType(e.target.value as ChatbotRuleTriggerType)
        }
      >
        <option value="EXACT_MATCH">Exact match</option>
        <option value="CONTAINS">Contains</option>
        <option value="STARTS_WITH">Starts with</option>
        <option value="FALLBACK">Fallback</option>
      </select>
      <Input
        placeholder="When visitor says…"
        value={triggerText}
        onChange={(e) => setTriggerText(e.target.value)}
      />
      <Textarea
        placeholder="Reply with…"
        value={responseText}
        onChange={(e) => setResponseText(e.target.value)}
        rows={2}
      />
      <Button
        size="sm"
        disabled={!triggerText.trim() || !responseText.trim()}
        onClick={() =>
          createChatbotRule(chatbotId, {
            triggerType,
            triggerText: triggerText.trim(),
            responseText: responseText.trim(),
          }).then(() => {
            setTriggerText("");
            setResponseText("");
            onAdded();
            toast.success("Rule added");
          })
        }
      >
        <Plus className="mr-1 size-4" />
        Add rule
      </Button>
    </div>
  );
}
