"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { startEmailConversation } from "@/features/conversations/api/conversations.api";

interface NewEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function NewEmailDialog({
  open,
  onOpenChange,
  onCreated,
}: NewEmailDialogProps) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      startEmailConversation({
        toEmail: toEmail.trim(),
        subject: subject.trim() || undefined,
        text: text.trim() || undefined,
      }),
    onSuccess: (conversation) => {
      toast.success("Email conversation started");
      onCreated(conversation.id);
      onOpenChange(false);
      setToEmail("");
      setSubject("");
      setText("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New email</DialogTitle>
          <DialogDescription>
            Send from your CodeSol business address. Replies return to this
            conversation automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-email-to">To</Label>
            <Input
              id="new-email-to"
              type="email"
              placeholder="customer@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email-subject">Subject</Label>
            <Input
              id="new-email-subject"
              placeholder="How can we help?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email-body">Message</Label>
            <Textarea
              id="new-email-body"
              rows={5}
              placeholder="Write your message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !toEmail.trim() ||
              (!text.trim() && !subject.trim())
            }
          >
            {mutation.isPending ? "Sending…" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
