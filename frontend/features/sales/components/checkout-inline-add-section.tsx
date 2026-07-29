"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  getGiftCardSettings,
  previewGiftCardNumber,
} from "@/features/gift-cards/api/gift-cards.api";
import { listPackageTemplates } from "@/features/packages/api/packages.api";
import { CheckoutMembershipField } from "@/features/sales/components/checkout-membership-field";
import type { InlineAddMode } from "@/features/sales/hooks/use-checkout-panel";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_FIELD_CLASS,
  DRAWER_FORM_STACK_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<Exclude<InlineAddMode, null>, string> = {
  service: "Add service",
  product: "Add product",
  giftCard: "Add gift card",
  package: "Add package",
  offer: "Apply offer",
  accountBalance: "Add account balance",
};

export interface CheckoutInlineAddSectionProps {
  mode: InlineAddMode;
  contactId: string;
  onClose: () => void;
  serviceItems: Array<{ value: string; label: string }>;
  selectedServiceId: string | null;
  onServiceChange: (serviceId: string | null) => void;
  staffItems: Array<{ value: string; label: string }>;
  selectedStaffId: string | null;
  onStaffChange: (staffId: string | null) => void;
  selectedMembershipKey: string;
  onMembershipChange: (value: string) => void;
  onAddService: () => void;
  servicePending: boolean;
  productItems: Array<{ value: string; label: string }>;
  selectedProductKey: string | null;
  onProductChange: (key: string | null) => void;
  productQty: number;
  onProductQtyChange: (qty: number) => void;
  onAddProduct: () => void;
  productPending: boolean;
  offerItems: Array<{ value: string; label: string }>;
  selectedOfferId: string | null;
  onOfferChange: (offerId: string | null) => void;
  onApplyOffer: () => void;
  offerPending: boolean;
  depositAmount: number;
  onDepositAmountChange: (amount: number) => void;
  onAddDeposit: () => void;
  depositPending: boolean;
  onAddGiftCard: (values: {
    number?: string;
    amount: number;
    ownerContactId: string;
    sendDigital: boolean;
  }) => void;
  giftCardPending: boolean;
  onAddPackage: (values: {
    packageTemplateId: string;
    ownerContactId: string;
    isDemo: boolean;
  }) => void;
  packagePending: boolean;
}

export function CheckoutInlineAddSection({
  mode,
  contactId,
  onClose,
  serviceItems,
  selectedServiceId,
  onServiceChange,
  staffItems,
  selectedStaffId,
  onStaffChange,
  selectedMembershipKey,
  onMembershipChange,
  onAddService,
  servicePending,
  productItems,
  selectedProductKey,
  onProductChange,
  productQty,
  onProductQtyChange,
  onAddProduct,
  productPending,
  offerItems,
  selectedOfferId,
  onOfferChange,
  onApplyOffer,
  offerPending,
  depositAmount,
  onDepositAmountChange,
  onAddDeposit,
  depositPending,
  onAddGiftCard,
  giftCardPending,
  onAddPackage,
  packagePending,
}: CheckoutInlineAddSectionProps) {
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");
  const [giftCardOwnerId, setGiftCardOwnerId] = useState<string | null>(contactId);
  const [sendDigital, setSendDigital] = useState(false);
  const [packageTemplateId, setPackageTemplateId] = useState<string | null>(null);
  const [packageOwnerId, setPackageOwnerId] = useState<string | null>(contactId);
  const [isDemoPackage, setIsDemoPackage] = useState(false);

  const giftCardSettingsQuery = useQuery({
    queryKey: queryKeys.giftCards.settings(),
    queryFn: getGiftCardSettings,
    enabled: mode === "giftCard",
  });

  const contactsQuery = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: () => listContacts({ limit: 100 }),
    enabled: mode === "giftCard" || mode === "package",
  });

  const packageTemplatesQuery = useQuery({
    queryKey: queryKeys.packages.templates(),
    queryFn: listPackageTemplates,
    enabled: mode === "package",
  });

  const contactOptions =
    contactsQuery.data?.items.map((contact) => ({
      value: contact.id,
      label:
        contact.displayName ||
        [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
        contact.email ||
        contact.id,
    })) ?? [];

  const packageOptions =
    packageTemplatesQuery.data?.map((template) => ({
      value: template.id,
      label: `${template.emoji ?? ""} ${template.name} — $${template.totalPrice}`.trim(),
    })) ?? [];

  useEffect(() => {
    if (mode !== "giftCard") return;
    setGiftCardOwnerId(contactId);
    setGiftCardAmount("");
    setSendDigital(false);
    void (async () => {
      if (giftCardSettingsQuery.data?.autoGenerateNumber) {
        const preview = await previewGiftCardNumber();
        setGiftCardNumber(preview.number ?? "");
      } else {
        setGiftCardNumber("");
      }
    })();
  }, [mode, contactId, giftCardSettingsQuery.data?.autoGenerateNumber]);

  useEffect(() => {
    if (mode !== "package") return;
    setPackageOwnerId(contactId);
    setPackageTemplateId(null);
    setIsDemoPackage(false);
  }, [mode, contactId]);

  if (!mode) return null;

  const autoGenerateGiftCardNumber =
    giftCardSettingsQuery.data?.autoGenerateNumber ?? false;

  return (
    <div className="rounded-[10px] border border-border/60 bg-muted/15 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {MODE_LABELS[mode]}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close add panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className={DRAWER_FORM_STACK_CLASS}>
        {mode === "service" ? (
          <>
            <SearchableSelect
              items={serviceItems}
              value={selectedServiceId}
              onValueChange={onServiceChange}
              placeholder="Select service…"
              triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
            />
            {selectedServiceId && staffItems.length > 0 ? (
              <div className={DRAWER_FORM_FIELD_CLASS}>
                <Label className={DRAWER_FIELD_LABEL_CLASS}>Staff</Label>
                <SearchableSelect
                  items={staffItems}
                  value={selectedStaffId}
                  onValueChange={onStaffChange}
                  placeholder="Staff (optional)"
                  triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
                />
              </div>
            ) : null}
            <CheckoutMembershipField
              contactId={contactId}
              serviceId={selectedServiceId}
              value={selectedMembershipKey}
              onValueChange={onMembershipChange}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!selectedServiceId || servicePending}
              onClick={onAddService}
            >
              Add to checkout
            </Button>
          </>
        ) : null}

        {mode === "product" ? (
          <>
            <SearchableSelect
              items={productItems}
              value={selectedProductKey}
              onValueChange={onProductChange}
              placeholder="Select product…"
              triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
            />
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Quantity</Label>
              <Input
                type="number"
                min={1}
                step="1"
                value={productQty || ""}
                onChange={(event) =>
                  onProductQtyChange(parseFloat(event.target.value) || 0)
                }
                className={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={
                !selectedProductKey ||
                productQty <= 0 ||
                productPending
              }
              onClick={onAddProduct}
            >
              Add to checkout
            </Button>
          </>
        ) : null}

        {mode === "offer" ? (
          <>
            <SearchableSelect
              items={offerItems}
              value={selectedOfferId}
              onValueChange={onOfferChange}
              placeholder="Select a staff offer…"
              triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!selectedOfferId || offerPending}
              onClick={onApplyOffer}
            >
              Apply offer
            </Button>
          </>
        ) : null}

        {mode === "accountBalance" ? (
          <>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Amount</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={depositAmount || ""}
                onChange={(event) =>
                  onDepositAmountChange(parseFloat(event.target.value) || 0)
                }
                className={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={depositAmount <= 0 || depositPending}
              onClick={onAddDeposit}
            >
              Add to checkout
            </Button>
          </>
        ) : null}

        {mode === "giftCard" ? (
          <>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Gift card number</Label>
              <div className="relative">
                {!autoGenerateGiftCardNumber ? (
                  <ScanLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                ) : null}
                <Input
                  className={cn(
                    DRAWER_FIELD_CONTROL_CLASS,
                    !autoGenerateGiftCardNumber && "pl-8",
                  )}
                  value={giftCardNumber}
                  onChange={(event) => setGiftCardNumber(event.target.value)}
                  placeholder="Enter or scan gift card number"
                  readOnly={autoGenerateGiftCardNumber}
                />
              </div>
            </div>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={giftCardAmount}
                onChange={(event) => setGiftCardAmount(event.target.value)}
                className={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Owner client</Label>
              <SearchableSelect
                items={contactOptions}
                value={giftCardOwnerId}
                onValueChange={setGiftCardOwnerId}
                placeholder="Who will receive this gift card"
                triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="inline-send-digital"
                checked={sendDigital}
                onCheckedChange={(checked) => setSendDigital(checked === true)}
              />
              <Label htmlFor="inline-send-digital" className="font-normal">
                Email this gift card to the owner after checkout
              </Label>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={
                !giftCardOwnerId ||
                !giftCardAmount ||
                parseFloat(giftCardAmount) <= 0 ||
                (!autoGenerateGiftCardNumber && !giftCardNumber.trim()) ||
                giftCardPending
              }
              onClick={() =>
                onAddGiftCard({
                  number: giftCardNumber.trim() || undefined,
                  amount: parseFloat(giftCardAmount),
                  ownerContactId: giftCardOwnerId!,
                  sendDigital,
                })
              }
            >
              Add to checkout
            </Button>
          </>
        ) : null}

        {mode === "package" ? (
          <>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Package</Label>
              <SearchableSelect
                items={packageOptions}
                value={packageTemplateId}
                onValueChange={setPackageTemplateId}
                placeholder="Select package template"
                triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <div className={DRAWER_FORM_FIELD_CLASS}>
              <Label className={DRAWER_FIELD_LABEL_CLASS}>Client</Label>
              <SearchableSelect
                items={contactOptions}
                value={packageOwnerId}
                onValueChange={setPackageOwnerId}
                placeholder="Select client"
                triggerClassName={DRAWER_FIELD_CONTROL_CLASS}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="inline-demo-package"
                checked={isDemoPackage}
                onCheckedChange={(checked) => setIsDemoPackage(checked === true)}
              />
              <Label htmlFor="inline-demo-package" className="font-normal">
                Mark as demo
              </Label>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!packageTemplateId || !packageOwnerId || packagePending}
              onClick={() =>
                onAddPackage({
                  packageTemplateId: packageTemplateId!,
                  ownerContactId: packageOwnerId!,
                  isDemo: isDemoPackage,
                })
              }
            >
              Add to checkout
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
