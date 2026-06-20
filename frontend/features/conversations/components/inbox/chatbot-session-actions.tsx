"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  convertChatbotSessionForConversation,
  endChatbotSessionForConversation,
  pauseChatbotForConversation,
  resumeChatbotForConversation,
} from "@/features/conversations/api/conversation-notes.api";
import { queryKeys } from "@/lib/query/keys";

interface ChatbotSessionActionsProps {
  conversationId: string;
  botPaused?: boolean;
}

export function ChatbotSessionActions({
  conversationId,
  botPaused = false,
}: ChatbotSessionActionsProps) {
  const queryClient = useQueryClient();
  const [paused, setPaused] = useState(botPaused);

  useEffect(() => {
    setPaused(botPaused);
  }, [botPaused, conversationId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.chatbots.all() });
  };

  const endMutation = useMutation({
    mutationFn: () => endChatbotSessionForConversation(conversationId),
    onSuccess: (result) => {
      invalidate();
      if (result.sessionId) toast.success("Chat session ended");
      else toast.info("No active chat session");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertMutation = useMutation({
    mutationFn: () => convertChatbotSessionForConversation(conversationId),
    onSuccess: (result) => {
      invalidate();
      if (result.sessionId) toast.success("Chat marked as converted");
      else toast.info("No active chat session");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseChatbotForConversation(conversationId),
    onSuccess: () => {
      invalidate();
      setPaused(true);
      toast.success("Bot paused — you are in control");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeChatbotForConversation(conversationId),
    onSuccess: () => {
      invalidate();
      setPaused(false);
      toast.success("Bot resumed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending =
    endMutation.isPending ||
    convertMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending;

  return (
    <div className="flex items-center gap-1">
      {paused ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={pending}
          onClick={() => resumeMutation.mutate()}
        >
          {resumeMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <PlayCircle className="size-3.5" />
          )}
          Resume bot
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={pending}
          onClick={() => pauseMutation.mutate()}
        >
          {pauseMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <PauseCircle className="size-3.5" />
          )}
          Pause bot
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={pending}
        onClick={() => endMutation.mutate()}
      >
        {endMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <XCircle className="size-3.5" />
        )}
        End session
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={pending}
        onClick={() => convertMutation.mutate()}
      >
        {convertMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
        Convert
      </Button>
    </div>
  );
}
