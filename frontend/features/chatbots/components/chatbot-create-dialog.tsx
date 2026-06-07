"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  activateChatbot,
  createChatbot,
  getChatbotEmbed,
} from "@/features/chatbots/api/chatbots.api";
import {
  chatbotCreateDefaults,
  chatbotCreateSchema,
  type ChatbotCreateFormValues,
} from "@/features/chatbots/schemas/chatbot-create-profile";

interface ChatbotCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

const POSITION_OPTIONS = [
  { value: "BOTTOM_RIGHT", label: "Bottom right" },
  { value: "BOTTOM_LEFT", label: "Bottom left" },
];

export function ChatbotCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: ChatbotCreateDialogProps) {
  const [step, setStep] = useState(0);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [embedScript, setEmbedScript] = useState("");

  const form = useForm<ChatbotCreateFormValues>({
    resolver: zodResolver(chatbotCreateSchema),
    defaultValues: chatbotCreateDefaults,
  });

  useEffect(() => {
    if (!open) {
      setStep(0);
      setCreatedId(null);
      setEmbedScript("");
      form.reset(chatbotCreateDefaults);
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (values: ChatbotCreateFormValues) => {
      const bot = await createChatbot({
        name: values.name.trim(),
        widgetTitle: values.widgetTitle.trim(),
        welcomeMessage: values.welcomeMessage.trim(),
        requireName: values.requireName,
        requireEmail: values.requireEmail,
        requirePhone: values.requirePhone,
        allowAnonymous: values.allowAnonymous,
        collectContactInfo: true,
        autoReplyEnabled: values.autoReplyEnabled,
        primaryColor: values.primaryColor,
        position: values.position,
        showBranding: values.showBranding,
      });
      await activateChatbot(bot.id);
      const embed = await getChatbotEmbed(bot.id);
      return { bot, embed };
    },
    onSuccess: ({ bot, embed }) => {
      setCreatedId(bot.id);
      setEmbedScript(embed.embedCode ?? embed.embedScript);
      setStep(4);
      toast.success("Chatbot created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleNext = async () => {
    if (step === 0) {
      const valid = await form.trigger(["name", "widgetTitle", "welcomeMessage"]);
      if (!valid) return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {step === 4
              ? "Chatbot created"
              : ["Basic info", "Lead capture", "Design", "Review"][
                  step
                ] ?? "Create website chatbot"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          {step < 4 ? (
            <DialogBody className="space-y-4">
              {step === 0 ? (
                <>
                  <TextField
                    control={form.control}
                    name="name"
                    label="Chatbot name"
                    placeholder="Website support"
                  />
                  <TextField
                    control={form.control}
                    name="widgetTitle"
                    label="Widget title"
                    placeholder="Chat with us"
                  />
                  <TextField
                    control={form.control}
                    name="welcomeMessage"
                    label="Welcome message"
                    placeholder="Hi there! How can we help you today?"
                    multiline
                  />
                </>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <CheckboxField
                    control={form.control}
                    name="requireName"
                    label="Ask for name"
                  />
                  <CheckboxField
                    control={form.control}
                    name="requireEmail"
                    label="Ask for email"
                  />
                  <CheckboxField
                    control={form.control}
                    name="requirePhone"
                    label="Ask for phone"
                  />
                  <CheckboxField
                    control={form.control}
                    name="allowAnonymous"
                    label="Allow anonymous chat"
                  />
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <CheckboxField
                    control={form.control}
                    name="autoReplyEnabled"
                    label="Automatic replies"
                    description="Add more Q&A rules after creation in Bot Replies."
                  />
                </div>
              ) : null}

              {step === 3 ? (
                <>
                  <TextField
                    control={form.control}
                    name="primaryColor"
                    label="Primary color"
                    type="color"
                  />
                  <SelectField
                    control={form.control}
                    name="position"
                    label="Position"
                    items={POSITION_OPTIONS}
                    searchable={false}
                  />
                  <CheckboxField
                    control={form.control}
                    name="showBranding"
                    label="Show branding"
                  />
                </>
              ) : null}
            </DialogBody>
          ) : (
            <DialogBody className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste this embed code before the closing &lt;/body&gt; tag on your
                website.
              </p>
              <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">
                {embedScript}
              </pre>
            </DialogBody>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {step < 4 ? (
              <>
                <div className="flex gap-2">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      Back
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                </div>
                {step < 3 ? (
                  <Button type="button" onClick={() => void handleNext()}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={createMutation.isPending}
                    onClick={form.handleSubmit((values) =>
                      createMutation.mutate(values),
                    )}
                  >
                    {createMutation.isPending ? "Creating…" : "Create chatbot"}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(embedScript);
                    toast.success("Embed code copied");
                  }}
                >
                  Copy embed code
                </Button>
                {createdId ? (
                  <Button type="button" onClick={() => onCreated(createdId)}>
                    Continue editing
                  </Button>
                ) : null}
              </div>
            )}
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
