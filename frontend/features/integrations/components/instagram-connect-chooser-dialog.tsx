"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
import type { InstagramAuthFlowParam } from "@/features/integrations/utils/integrations";
import { cn } from "@/lib/utils";

export interface InstagramConnectChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (authFlow: InstagramAuthFlowParam) => void;
}

const OPTIONS: Array<{
  authFlow: InstagramAuthFlowParam;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    authFlow: "facebook_login",
    title: "Instagram with Facebook",
    description:
      "Connect through Facebook Login and choose the Facebook Page linked to your Instagram Professional account.",
    badge: "Facebook",
  },
  {
    authFlow: "instagram_login",
    title: "Direct Instagram Integration",
    description:
      "Connect with Instagram Login only. No Facebook Page is required.",
    badge: "Instagram",
  },
];

export function InstagramConnectChooserDialog({
  open,
  onOpenChange,
  onSelect,
}: InstagramConnectChooserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Choose how to connect Instagram</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {OPTIONS.map((option) => (
            <div
              key={option.authFlow}
              className={cn(
                "flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative shrink-0">
                  <IntegrationProviderIcon
                    providerKey="instagram"
                    providerName="Instagram"
                    size="md"
                  />
                  {option.authFlow === "facebook_login" ? (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-white shadow-sm">
                      <IntegrationProviderIcon
                        providerKey="facebook"
                        providerName="Facebook"
                        size="sm"
                      />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold leading-tight">
                      {option.title}
                    </p>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 self-stretch sm:self-center"
                onClick={() => {
                  onOpenChange(false);
                  onSelect(option.authFlow);
                }}
              >
                Select
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Meta only supports Business or Creator Instagram accounts for these
            connections.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
