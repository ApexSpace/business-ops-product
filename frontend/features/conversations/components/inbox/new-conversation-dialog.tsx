"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import {
  channelLabel,
  ensureContactConversation,
  listContactReplyChannels,
  type ContactReplyChannel,
  type ConversationChannel,
  type EnsureContactConversationInput,
} from "@/features/conversations/api/conversations.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { queryKeys } from "@/lib/query/keys";

const STARTABLE_CHANNELS = new Set<ConversationChannel>([
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "FACEBOOK",
  "INSTAGRAM",
]);

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

function resetFormState(setters: {
  setContactId: (value: string) => void;
  setChannel: (value: ConversationChannel | null) => void;
  setSubject: (value: string) => void;
  setText: (value: string) => void;
}) {
  setters.setContactId("");
  setters.setChannel(null);
  setters.setSubject("");
  setters.setText("");
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: NewConversationDialogProps) {
  const { contactsApiBase } = useConversationsHost();
  const [contactId, setContactId] = useState("");
  const [channel, setChannel] = useState<ConversationChannel | null>(null);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");

  const { data: replyChannels = [], isFetching: channelsLoading } = useQuery({
    queryKey: queryKeys.conversations.replyChannels(contactId, contactsApiBase),
    queryFn: () => listContactReplyChannels(contactId, contactsApiBase),
    enabled: open && Boolean(contactId),
  });

  const startableChannels = useMemo(
    () =>
      replyChannels.filter((item): item is ContactReplyChannel =>
        STARTABLE_CHANNELS.has(item.channel),
      ),
    [replyChannels],
  );

  const selectedChannel = useMemo(
    () => startableChannels.find((item) => item.channel === channel) ?? null,
    [channel, startableChannels],
  );

  useEffect(() => {
    if (!contactId) {
      setChannel(null);
      return;
    }

    setChannel((current) => {
      if (
        current &&
        startableChannels.some((item) => item.channel === current)
      ) {
        return current;
      }
      const ready = startableChannels.find((item) => item.readyForMessaging);
      return ready?.channel ?? startableChannels[0]?.channel ?? null;
    });
  }, [contactId, startableChannels]);

  useEffect(() => {
    if (!open) {
      resetFormState({ setContactId, setChannel, setSubject, setText });
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contactId || !channel || !selectedChannel?.readyForMessaging) {
        throw new Error("Select a contact and a ready channel to continue.");
      }

      const input: EnsureContactConversationInput = {
        channel: channel as EnsureContactConversationInput["channel"],
      };

      if (channel === "EMAIL") {
        input.subject = subject.trim() || undefined;
        input.text = text.trim() || undefined;
      }

      return ensureContactConversation(contactId, input, contactsApiBase);
    },
    onSuccess: (conversation) => {
      toast.success("Conversation started");
      onCreated(conversation.id);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSubmit =
    Boolean(contactId) &&
    Boolean(selectedChannel?.readyForMessaging) &&
    !mutation.isPending;

  const showEmailFields = channel === "EMAIL";
  const showChannelEmpty =
    Boolean(contactId) && !channelsLoading && startableChannels.length === 0;
  const unavailableHint =
    selectedChannel && !selectedChannel.readyForMessaging
      ? selectedChannel.unavailableReason?.trim() ||
        "Messaging is not ready for this channel."
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Choose a contact, then pick a channel available for that contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-conversation-contact">Contact</Label>
            <ContactPicker
              id="new-conversation-contact"
              value={contactId}
              onValueChange={(next) => {
                setContactId(next);
                setChannel(null);
              }}
              apiBase={contactsApiBase}
              placeholder="Search or add contact…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-conversation-channel">Channel</Label>
            {!contactId ? (
              <p className="text-sm text-muted-foreground">
                Select a contact to see available channels.
              </p>
            ) : channelsLoading ? (
              <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading channels…
              </div>
            ) : showChannelEmpty ? (
              <p className="text-sm text-muted-foreground">
                This contact has no email or phone on file. Add contact details
                to start a conversation.
              </p>
            ) : (
              <Select
                value={channel ?? ""}
                onValueChange={(next) =>
                  setChannel(
                    next
                      ? (next as ConversationChannel)
                      : null,
                  )
                }
              >
                <SelectTrigger
                  id="new-conversation-channel"
                  className="w-full"
                  aria-label="Conversation channel"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {channel ? channelLabel(channel) : "Select channel"}
                  </span>
                </SelectTrigger>
                <SelectContent align="start">
                  {startableChannels.map((item) => (
                    <SelectItem key={item.channel} value={item.channel}>
                      <span className="flex items-center gap-2">
                        {channelLabel(item.channel)}
                        {!item.readyForMessaging ? (
                          <span className="text-muted-foreground">
                            (setup required)
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {unavailableHint ? (
              <p className="text-xs text-muted-foreground">{unavailableHint}</p>
            ) : null}
          </div>

          {showEmailFields ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-conversation-subject">Subject</Label>
                <Input
                  id="new-conversation-subject"
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-conversation-body">Message</Label>
                <Textarea
                  id="new-conversation-body"
                  rows={5}
                  placeholder="Optional — leave blank to compose in the inbox"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending ? "Starting…" : "Start conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
