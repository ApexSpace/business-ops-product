"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { listPackageTemplates } from "@/features/packages/api/packages.api";
import { queryKeys } from "@/lib/query/keys";

export interface PackageSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOwnerContactId?: string | null;
  onSubmit: (values: {
    packageTemplateId: string;
    ownerContactId: string;
    isDemo: boolean;
  }) => void;
  isPending?: boolean;
}

export function PackageSaleDialog({
  open,
  onOpenChange,
  defaultOwnerContactId,
  onSubmit,
  isPending,
}: PackageSaleDialogProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [ownerContactId, setOwnerContactId] = useState<string | null>(
    defaultOwnerContactId ?? null,
  );
  const [isDemo, setIsDemo] = useState(false);

  const templatesQuery = useQuery({
    queryKey: queryKeys.packages.templates(),
    queryFn: listPackageTemplates,
    enabled: open,
  });

  const contactsQuery = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: () => listContacts({ limit: 100 }),
    enabled: open,
  });

  const templateOptions =
    templatesQuery.data?.map((t) => ({
      value: t.id,
      label: `${t.emoji ?? ""} ${t.name} — $${t.totalPrice}`.trim(),
    })) ?? [];

  const contactOptions =
    contactsQuery.data?.items.map((c) => ({
      value: c.id,
      label:
        c.displayName ||
        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
        c.email ||
        c.id,
    })) ?? [];

  useEffect(() => {
    if (!open) return;
    setOwnerContactId(defaultOwnerContactId ?? null);
    setTemplateId(null);
    setIsDemo(false);
  }, [open, defaultOwnerContactId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell package</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Package</Label>
            <SearchableSelect
              inDialog
              items={templateOptions}
              value={templateId}
              onValueChange={setTemplateId}
              placeholder="Select package template"
            />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <SearchableSelect
              inDialog
              items={contactOptions}
              value={ownerContactId}
              onValueChange={setOwnerContactId}
              placeholder="Select client"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="demo-sale"
              checked={isDemo}
              onCheckedChange={(v) => setIsDemo(v === true)}
            />
            <Label htmlFor="demo-sale">Mark as demo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!templateId || !ownerContactId || isPending}
            onClick={() =>
              onSubmit({
                packageTemplateId: templateId!,
                ownerContactId: ownerContactId!,
                isDemo,
              })
            }
          >
            Add to sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
