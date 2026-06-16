"use client";

import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BillingOwnerRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageTeam?: boolean;
}

export function BillingOwnerRequiredDialog({
  open,
  onOpenChange,
  canManageTeam = false,
}: BillingOwnerRequiredDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Business owner required</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This workspace needs an owner before you can subscribe. Please
                ask an admin to assign a business owner.
              </p>
              {canManageTeam ? (
                <p>
                  You can invite or assign an owner from{" "}
                  <Link
                    href="/business/settings/team"
                    className="font-medium text-foreground underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Team settings
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
