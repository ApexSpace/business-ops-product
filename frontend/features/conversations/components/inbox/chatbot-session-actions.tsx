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
import { cn } from "@/lib/utils";

const ACTION_BTN_CLASS =
  "h-7 shrink-0 gap-1 px-1.5 text-[10px] sm:px-2 sm:text-[11px]";

interface ChatbotSessionActionsProps {
  conversationId: string;
  botPaused?: boolean;
  className?: string;
}

export function ChatbotSessionActions({
  conversationId,
  botPaused = false,
  className,
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
    <div className={cn("flex items-center gap-1", className)}>
      {paused ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={ACTION_BTN_CLASS}
          disabled={pending}
          onClick={() => resumeMutation.mutate()}
          title="Resume bot"
        >
          {resumeMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <PlayCircle className="size-3" />
          )}
          <span className="hidden min-[420px]:inline">Resume</span>
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={ACTION_BTN_CLASS}
          disabled={pending}
          onClick={() => pauseMutation.mutate()}
          title="Pause bot"
        >
          {pauseMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <PauseCircle className="size-3" />
          )}
          <span className="hidden min-[420px]:inline">Pause</span>
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={ACTION_BTN_CLASS}
        disabled={pending}
        onClick={() => endMutation.mutate()}
        title="End session"
      >
        {endMutation.isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <XCircle className="size-3" />
        )}
        <span className="hidden min-[480px]:inline">End</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={ACTION_BTN_CLASS}
        disabled={pending}
        onClick={() => convertMutation.mutate()}
        title="Mark converted"
      >
        {convertMutation.isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3" />
        )}
        <span className="hidden min-[540px]:inline">Convert</span>
      </Button>
    </div>
  );
}
