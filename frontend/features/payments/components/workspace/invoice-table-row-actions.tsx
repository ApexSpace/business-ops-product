"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FinancialRowActionsMenu } from "@/features/payments/components/workspace/financial-row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { resolveInvoicePublicUrl } from "@/features/invoices/utils/invoice-payment-link";
import type { Invoice } from "@/features/invoices/types";

const COPIED_RESET_MS = 2000;

interface InvoiceTableRowActionsProps {
  invoice: Invoice;
  canCopyLink: boolean;
  onView: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onVoid?: () => void;
  onRecordPayment?: () => void;
}

export function InvoiceTableRowActions({
  invoice,
  canCopyLink,
  onView,
  onEdit,
  onDuplicate,
  onVoid,
  onRecordPayment,
}: InvoiceTableRowActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = resolveInvoicePublicUrl(invoice);
    if (!url) {
      toast.error("Public link is not available for this invoice");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Payment link copied");
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canCopyLink ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <IconButton
                aria-label={copied ? "Copied" : "Copy payment link"}
                className="size-8"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </IconButton>
            }
          />
          <TooltipContent>{copied ? "Copied" : "Copy payment link"}</TooltipContent>
        </Tooltip>
      ) : null}

      <FinancialRowActionsMenu
        viewLabel="View invoice"
        onView={onView}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onVoid={onVoid}
        extraItems={
          onRecordPayment ? (
            <DropdownMenuItem onClick={onRecordPayment}>
              Record payment
            </DropdownMenuItem>
          ) : null
        }
      />
    </div>
  );
}
