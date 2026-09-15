"use client";

import { Badge } from "@/components/ui/badge";
import type { WhatsAppTemplateStatus } from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import {
  formatTemplateStatus,
  templateStatusToneClass,
} from "@/features/whatsapp-settings/utils/whatsapp-template-display.util";
import { cn } from "@/lib/utils";

export interface WhatsAppTemplateStatusBadgeProps {
  status: WhatsAppTemplateStatus;
  className?: string;
}

export function WhatsAppTemplateStatusBadge({
  status,
  className,
}: WhatsAppTemplateStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", templateStatusToneClass(status), className)}
    >
      {formatTemplateStatus(status)}
    </Badge>
  );
}
