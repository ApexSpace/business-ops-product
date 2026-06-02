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

export interface OAuthPopupBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oauthUrl: string | null;
}

export function OAuthPopupBlockedDialog({
  open,
  onOpenChange,
  oauthUrl,
}: OAuthPopupBlockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Popup blocked</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            Your browser blocked the OAuth popup. Allow popups for this site and
            try again, or open the authorization flow in this tab.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!oauthUrl}
            onClick={() => {
              if (oauthUrl) {
                window.location.href = oauthUrl;
              }
            }}
          >
            Open OAuth flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
