"use client";

import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WORKSPACE_PANEL_CLASS } from "@/lib/contact-workspace";

interface ContactConversationPanelProps {
  contactName: string;
  className?: string;
}

export function ContactConversationPanel({
  contactName,
  className,
}: ContactConversationPanelProps) {
  return (
    <section className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted ring-1 ring-border/60">
            <MessageSquare className="size-7 text-muted-foreground/70" />
          </div>
          <div className="max-w-sm space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Start a New Conversation
            </h2>
            <p className="text-sm text-muted-foreground">
              Message {contactName} from one inbox. SMS, email, and WhatsApp
              will connect here soon.
            </p>
          </div>
          <Button size="sm" disabled>
            Connect channel (soon)
          </Button>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-muted/20 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Select disabled defaultValue="sms">
              <SelectTrigger className="h-9 w-full sm:w-[140px]" size="sm">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Input
              disabled
              placeholder="Type a message…"
              className="min-h-9 flex-1"
            />
            <Button size="sm" disabled className="shrink-0">
              <Send className="mr-1.5 size-4" />
              Send
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Composer is a preview — conversations module coming soon
          </p>
        </div>
      </div>
    </section>
  );
}
