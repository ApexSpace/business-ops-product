"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Minus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getPublicChatbotConfig,
  listPublicChatbotMessages,
  sendPublicChatbotMessage,
  startPublicChatbotSession,
  type PublicChatbotMessage,
} from "@/features/public-chatbot/api/public-chatbot.api";
import {
  getOrCreateVisitorId,
  getStoredSessionId,
  storeSessionId,
} from "@/features/public-chatbot/utils/visitor-id";
import { cn } from "@/lib/utils";

const POLL_MS = 4000;

interface PublicChatbotWidgetProps {
  publicKey: string;
  embedded?: boolean;
}

export function PublicChatbotWidget({
  publicKey,
  embedded = false,
}: PublicChatbotWidgetProps) {
  const [open, setOpen] = useState(embedded);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicChatbotMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [phase, setPhase] = useState<"form" | "chat">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const lastPollRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const configQuery = useQuery({
    queryKey: ["public-chatbot-config", publicKey],
    queryFn: () => getPublicChatbotConfig(publicKey),
    retry: false,
  });

  const config = configQuery.data;
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId(publicKey));
  }, [publicKey]);

  useEffect(() => {
    const stored = getStoredSessionId(publicKey);
    if (stored) {
      setSessionId(stored);
      setPhase("chat");
    } else if (config && !config.collectContactInfo) {
      setPhase("chat");
    }
  }, [publicKey, config]);

  const mergeMessages = useCallback((incoming: PublicChatbotMessage[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      try {
        const items = await listPublicChatbotMessages(
          sessionId,
          lastPollRef.current,
        );
        if (items.length > 0) {
          lastPollRef.current = items[items.length - 1]?.createdAt;
          mergeMessages(items);
        }
      } catch {
        /* ignore poll errors */
      }
    };
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [sessionId, mergeMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const startMutation = useMutation({
    mutationFn: (opts: { anonymous?: boolean }) => {
      const id = visitorId || getOrCreateVisitorId(publicKey);
      return startPublicChatbotSession(publicKey, {
        visitorId: id,
        visitorName: name.trim() || undefined,
        visitorEmail: email.trim() || undefined,
        visitorPhone: phone.trim() || undefined,
        initialMessage: notes.trim() || undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        anonymous: opts.anonymous,
      });
    },
    onSuccess: (data) => {
      storeSessionId(publicKey, data.sessionId);
      setSessionId(data.sessionId);
      setPhase("chat");
      if (notes.trim()) {
        setMessages([
          {
            id: `local-${Date.now()}`,
            direction: "INBOUND",
            senderType: "CONTACT",
            text: notes.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setNotes("");
    },
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendPublicChatbotMessage(sessionId!, text),
    onSuccess: (msg) => {
      mergeMessages([msg]);
      setComposer("");
      void listPublicChatbotMessages(sessionId!, lastPollRef.current).then(
        mergeMessages,
      );
    },
  });

  const positionClass =
    config?.position === "BOTTOM_LEFT" ? "left-5" : "right-5";

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (configQuery.isError || !config) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Chat is unavailable right now.
      </div>
    );
  }

  const launcher = !embedded ? (
    <button
      type="button"
      aria-label="Open chat"
      onClick={() => setOpen(true)}
      className={cn(
        "fixed bottom-5 z-[9998] flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105",
        positionClass,
      )}
      style={{ backgroundColor: config.primaryColor }}
    >
      <MessageCircle className="size-7 text-white" />
    </button>
  ) : null;

  const panel = open ? (
    <div
      className={cn(
        embedded
          ? "flex h-full min-h-[480px] w-full flex-col bg-background"
          : cn(
              "fixed bottom-5 z-[9999] flex h-[min(600px,85vh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
              positionClass,
            ),
      )}
    >
      <header
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        {config.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.avatarUrl}
            alt=""
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{config.widgetTitle}</p>
          <p className="text-xs opacity-90">
            {config.acknowledgementMessage ?? "We typically reply soon"}
          </p>
        </div>
        {!embedded ? (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </header>

      {phase === "form" && config.collectContactInfo && !sessionId ? (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">{config.welcomeMessage}</p>
          {config.requireName ? (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : (
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {config.requireEmail ? (
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          {config.requirePhone ? (
            <Input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          ) : null}
          {config.showNotesField ? (
            <Textarea
              placeholder="How can we help?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          ) : null}
          <Button
            disabled={startMutation.isPending}
            style={{ backgroundColor: config.primaryColor }}
            className="text-white"
            onClick={() => startMutation.mutate({})}
          >
            {startMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Start chat"
            )}
          </Button>
          {config.allowAnonymous ? (
            <Button
              variant="ghost"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate({ anonymous: true })}
            >
              Continue without details
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
          >
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {config.welcomeMessage}
              </p>
            ) : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.direction === "INBOUND"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground",
                )}
                style={
                  m.direction === "INBOUND"
                    ? { backgroundColor: config.primaryColor, color: "#fff" }
                    : undefined
                }
              >
                {m.text}
              </div>
            ))}
          </div>
          <footer className="flex gap-2 border-t p-3">
            <Input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="How can we help you today?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && composer.trim() && sessionId) {
                  sendMutation.mutate(composer.trim());
                }
              }}
            />
            <Button
              size="icon"
              disabled={!sessionId || !composer.trim() || sendMutation.isPending}
              style={{ backgroundColor: config.primaryColor }}
              className="shrink-0 text-white"
              onClick={() => {
                if (!sessionId) {
                  startMutation.mutate(
                    { anonymous: !config.collectContactInfo },
                    {
                      onSuccess: () => {
                        if (composer.trim()) {
                          sendMutation.mutate(composer.trim());
                        }
                      },
                    },
                  );
                } else {
                  sendMutation.mutate(composer.trim());
                }
              }}
            >
              <Send className="size-4" />
            </Button>
          </footer>
        </>
      )}

      {config.showBranding ? (
        <p className="border-t py-1 text-center text-[10px] text-muted-foreground">
          Powered by website chat
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {launcher}
      {panel}
    </>
  );
}
