"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  convertChatbotSessionForConversation,
  endChatbotSessionForConversation,
  pauseChatbotForConversation,
  resumeChatbotForConversation,
} from "@/features/conversations/api/conversation-notes.api";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

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
  const { apiBase, mode } = useConversationsHost();
  const queryClient = useQueryClient();
  const [paused, setPaused] = useState(botPaused);
  const chatbotsApiBase =
    mode === "platform" ? "platform/chatbots" : "chatbots";

  useEffect(() => {
    setPaused(botPaused);
  }, [botPaused, conversationId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(apiBase),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.chatbots.all(chatbotsApiBase),
    });
  };

  const endMutation = useMutation({
    mutationFn: () => endChatbotSessionForConversation(conversationId, apiBase),
    onSuccess: (result) => {
      invalidate();
      if (result.sessionId) toast.success("Chat session ended");
      else toast.info("No active chat session");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertMutation = useMutation({
    mutationFn: () =>
      convertChatbotSessionForConversation(conversationId, apiBase),
    onSuccess: (result) => {
      invalidate();
      if (result.sessionId) toast.success("Chat marked as converted");
      else toast.info("No active chat session");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseChatbotForConversation(conversationId, apiBase),
    onSuccess: () => {
      invalidate();
      setPaused(true);
      toast.success("Bot paused — you are in control");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeChatbotForConversation(conversationId, apiBase),
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
    <div className={cn("flex items-center gap-1.5", className)}>
      {paused ? (
        <span className="hidden text-[10px] font-medium text-amber-700 sm:inline dark:text-amber-400">
          Bot paused
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 gap-1 px-2 text-[11px]"
              disabled={pending}
              aria-label="Chatbot actions"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Bot className="size-3.5" />
              )}
              <span className="hidden min-[420px]:inline">Bot</span>
              <ChevronDown className="size-3 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-auto min-w-48">
          {paused ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => resumeMutation.mutate()}
            >
              <PlayCircle className="size-3.5" />
              Resume bot
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => pauseMutation.mutate()}
            >
              <PauseCircle className="size-3.5" />
              Pause bot
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={pending}
            onClick={() => endMutation.mutate()}
          >
            <XCircle className="size-3.5" />
            End session
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={() => convertMutation.mutate()}
          >
            <CheckCircle2 className="size-3.5" />
            Mark converted
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
