"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { listPackageTemplates } from "@/features/packages/api/packages.api";
import {
  SALES_DIALOG_BODY_CLASS,
  SALES_DIALOG_CONTENT_CLASS,
  SALES_DIALOG_DESCRIPTION_CLASS,
  SALES_DIALOG_FIELD_CLASS,
  SALES_DIALOG_FOOTER_CLASS,
  SALES_DIALOG_HEADER_CLASS,
  SALES_DIALOG_LABEL_CLASS,
  SALES_DIALOG_SECONDARY_BUTTON_CLASS,
  SALES_DIALOG_TITLE_CLASS,
  SALES_DRAWER_SELECT_TRIGGER_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
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
      <DialogContent size="md" className={SALES_DIALOG_CONTENT_CLASS}>
        <DialogHeader className={SALES_DIALOG_HEADER_CLASS}>
          <DialogTitle className={SALES_DIALOG_TITLE_CLASS}>
            Sell package
          </DialogTitle>
          <DialogDescription className={SALES_DIALOG_DESCRIPTION_CLASS}>
            Add a package template to this checkout.
          </DialogDescription>
        </DialogHeader>

        <div className={SALES_DIALOG_BODY_CLASS}>
          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label className={SALES_DIALOG_LABEL_CLASS}>Package</Label>
            <SearchableSelect
              inDialog
              items={templateOptions}
              value={templateId}
              onValueChange={setTemplateId}
              placeholder="Select package template"
              triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
            />
          </div>
          <div className={SALES_DIALOG_FIELD_CLASS}>
            <Label className={SALES_DIALOG_LABEL_CLASS}>Client</Label>
            <SearchableSelect
              inDialog
              items={contactOptions}
              value={ownerContactId}
              onValueChange={setOwnerContactId}
              placeholder="Select client"
              triggerClassName={SALES_DRAWER_SELECT_TRIGGER_CLASS}
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#E8E4DC] bg-white px-3">
            <Checkbox
              id="demo-sale"
              checked={isDemo}
              onCheckedChange={(v) => setIsDemo(v === true)}
              className="size-5 rounded-[4px] border-violet-primary-normal data-[checked]:border-violet-primary-normal data-[checked]:bg-violet-primary-normal"
            />
            <span className="text-[13px] font-medium leading-snug text-[#524346]">
              Mark as demo
            </span>
          </label>
        </div>

        <DialogFooter className={SALES_DIALOG_FOOTER_CLASS} sticky={false}>
          <Button
            type="button"
            variant="outline"
            className={SALES_DIALOG_SECONDARY_BUTTON_CLASS}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            className={DRAWER_PRIMARY_BUTTON_CLASS}
            disabled={!templateId || !ownerContactId || isPending}
            onClick={() =>
              onSubmit({
                packageTemplateId: templateId!,
                ownerContactId: ownerContactId!,
                isDemo,
              })
            }
          >
            {isPending ? "Adding…" : "Add to sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
