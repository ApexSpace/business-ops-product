import { z } from "zod";

export const chatbotCreateSchema = z.object({
  name: z.string().min(1, "Chatbot name is required"),
  widgetTitle: z.string().min(1, "Widget title is required"),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  requireName: z.boolean(),
  requireEmail: z.boolean(),
  requirePhone: z.boolean(),
  allowAnonymous: z.boolean(),
  autoReplyEnabled: z.boolean(),
  primaryColor: z.string(),
  position: z.enum(["BOTTOM_RIGHT", "BOTTOM_LEFT"]),
  showBranding: z.boolean(),
});

export type ChatbotCreateFormValues = z.infer<typeof chatbotCreateSchema>;

export const chatbotCreateDefaults: ChatbotCreateFormValues = {
  name: "",
  widgetTitle: "Chat with us",
  welcomeMessage: "Hi there! How can we help you today?",
  requireName: true,
  requireEmail: false,
  requirePhone: false,
  allowAnonymous: true,
  autoReplyEnabled: true,
  primaryColor: "#2563eb",
  position: "BOTTOM_RIGHT",
  showBranding: true,
};
