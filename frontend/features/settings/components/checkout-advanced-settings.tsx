"use client";

import { useCallback, useMemo, useState } from "react";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { useCheckoutAdvancedSettingsMutations } from "@/features/checkout-advanced-settings/hooks/use-checkout-advanced-settings-mutations";
import { useCheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/hooks/use-checkout-advanced-settings";
import {
  customPaymentMethodNamesToInput,
  formatCustomPaymentMethodsSummary,
  formatReceiptSettingsSummary,
  formatStaffRequirementsSummary,
  formatTipButtonsSummary,
  parseCustomPaymentMethodNamesInput,
} from "@/features/checkout-advanced-settings/schemas/checkout-advanced-settings-profile";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionState } from "@/lib/settings/use-settings-section-state";

type StaffDraft = {
  requireStaffForServices: boolean;
  requireStaffForProducts: boolean;
  requireStaffForGiftCards: boolean;
  requireStaffForPackages: boolean;
};

type ReceiptDraft = {
  showServiceProviderOnReceipt: boolean;
  receiptCustomFooterText: string;
};

export function CheckoutAdvancedSettingsScreen() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useCheckoutAdvancedSettings();
  const { updateMutation } = useCheckoutAdvancedSettingsMutations();

  const askTipPick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      askClientsForTip: settings.askClientsForTip,
    }),
    [],
  );

  const askTipProductsPick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      askForTipProductsOnly: settings.askForTipProductsOnly,
    }),
    [],
  );

  const signaturePick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      askClientsForSignature: settings.askClientsForSignature,
    }),
    [],
  );

  const checkPick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      enableCheckPayments: settings.enableCheckPayments,
    }),
    [],
  );

  const changeCalcPick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      showChangeCalculator: settings.showChangeCalculator,
    }),
    [],
  );

  const receiptPreviewPick = useCallback(
    (settings: NonNullable<typeof data>) => ({
      showReceiptPreview: settings.showReceiptPreview,
    }),
    [],
  );

  const staffPick = useCallback(
    (settings: NonNullable<typeof data>): StaffDraft => ({
      requireStaffForServices: settings.requireStaffForServices,
      requireStaffForProducts: settings.requireStaffForProducts,
      requireStaffForGiftCards: settings.requireStaffForGiftCards,
      requireStaffForPackages: settings.requireStaffForPackages,
    }),
    [],
  );

  const askTipSection = useSettingsSectionState(data, askTipPick);
  const askTipProductsSection = useSettingsSectionState(data, askTipProductsPick);
  const signatureSection = useSettingsSectionState(data, signaturePick);
  const checkSection = useSettingsSectionState(data, checkPick);
  const changeCalcSection = useSettingsSectionState(data, changeCalcPick);
  const receiptPreviewSection = useSettingsSectionState(data, receiptPreviewPick);
  const staffSection = useSettingsSectionState(data, staffPick);

  const [customMethodsDialogOpen, setCustomMethodsDialogOpen] = useState(false);
  const [tipButtonsDialogOpen, setTipButtonsDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [customMethodsInput, setCustomMethodsInput] = useState("");
  const [tipPercentsInput, setTipPercentsInput] = useState("");
  const [hideTipButtonsDraft, setHideTipButtonsDraft] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);

  const customMethodsSummary = useMemo(
    () => formatCustomPaymentMethodsSummary(data?.customPaymentMethodNames ?? []),
    [data?.customPaymentMethodNames],
  );

  const tipButtonsSummary = useMemo(
    () => (data ? formatTipButtonsSummary(data) : ""),
    [data],
  );

  const staffSummary = useMemo(
    () => (data ? formatStaffRequirementsSummary(data) : ""),
    [data],
  );

  const receiptSummary = useMemo(
    () => (data ? formatReceiptSettingsSummary(data) : ""),
    [data],
  );

  const save = useCallback(
    (body: Parameters<typeof updateMutation.mutate>[0]) => {
      updateMutation.mutate(body);
    },
    [updateMutation],
  );

  if (isLoading) {
    return <LoadingState label="Loading advanced settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load advanced settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Advanced Settings"
      description="Configure checkout tips, payment labels, staff requirements, and receipt options for staff POS sales."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsValueSection
          title="Custom Payment Method Labels"
          description="Display names for cash-like payment tiles (PayPal, Venmo, Zelle). No platform integration — payments are recorded manually for reporting."
          valueLabel={customMethodsSummary}
          onEdit={() => {
            setCustomMethodsInput(
              customPaymentMethodNamesToInput(data.customPaymentMethodNames),
            );
            setCustomMethodsDialogOpen(true);
          }}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Tip Buttons"
          description="Percentage presets shown on the payment screen."
          valueLabel={tipButtonsSummary}
          onEdit={() => {
            setTipPercentsInput(data.tipButtonPercents.join(", "));
            setHideTipButtonsDraft(data.hideTipButtons);
            setTipButtonsDialogOpen(true);
          }}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="ask-clients-for-tip"
          title="Ask clients for a tip"
          description="Show tip options on the staff checkout payment screen."
          checked={askTipSection.values?.askClientsForTip ?? false}
          onCheckedChange={(checked) =>
            askTipSection.commit({ askClientsForTip: checked })
          }
          onDiscard={askTipSection.reset}
          onSave={() =>
            save({
              askClientsForTip: askTipSection.values?.askClientsForTip,
            })
          }
          isDirty={askTipSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="ask-for-tip-products-only"
          title="Ask for tip on product sales only"
          description="Limit tip prompts to checkouts that include product line items."
          checked={askTipProductsSection.values?.askForTipProductsOnly ?? false}
          onCheckedChange={(checked) =>
            askTipProductsSection.commit({ askForTipProductsOnly: checked })
          }
          onDiscard={askTipProductsSection.reset}
          onSave={() =>
            save({
              askForTipProductsOnly:
                askTipProductsSection.values?.askForTipProductsOnly,
            })
          }
          isDirty={askTipProductsSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="ask-clients-for-signature"
          title="Signature Options"
          description="When enabled, clients will be asked for a signature during checkout. Requires Front Desk Display (coming soon)."
          checked={signatureSection.values?.askClientsForSignature ?? false}
          onCheckedChange={(checked) =>
            signatureSection.commit({ askClientsForSignature: checked })
          }
          onDiscard={signatureSection.reset}
          onSave={() =>
            save({
              askClientsForSignature:
                signatureSection.values?.askClientsForSignature,
            })
          }
          isDirty={signatureSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="enable-check-payments"
          title="Check Payments"
          description="Show a Check payment option on the staff checkout payment screen."
          checked={checkSection.values?.enableCheckPayments ?? false}
          onCheckedChange={(checked) =>
            checkSection.commit({ enableCheckPayments: checked })
          }
          onDiscard={checkSection.reset}
          onSave={() =>
            save({
              enableCheckPayments: checkSection.values?.enableCheckPayments,
            })
          }
          isDirty={checkSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="show-change-calculator"
          title="Change Calculator"
          description="When cash is selected, show amount tendered and change due."
          checked={changeCalcSection.values?.showChangeCalculator ?? false}
          onCheckedChange={(checked) =>
            changeCalcSection.commit({ showChangeCalculator: checked })
          }
          onDiscard={changeCalcSection.reset}
          onSave={() =>
            save({
              showChangeCalculator: changeCalcSection.values?.showChangeCalculator,
            })
          }
          isDirty={changeCalcSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="show-receipt-preview"
          title="Receipt Preview"
          description="Show a client-facing receipt preview after payment. Requires Front Desk Display (coming soon)."
          checked={receiptPreviewSection.values?.showReceiptPreview ?? false}
          onCheckedChange={(checked) =>
            receiptPreviewSection.commit({ showReceiptPreview: checked })
          }
          onDiscard={receiptPreviewSection.reset}
          onSave={() =>
            save({
              showReceiptPreview: receiptPreviewSection.values?.showReceiptPreview,
            })
          }
          isDirty={receiptPreviewSection.isDirty}
          isSaving={updateMutation.isPending}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Require Staff Assignments"
          description="Require a staff member on each line item before closing the sale."
          valueLabel={staffSummary}
          onEdit={() => setStaffDialogOpen(true)}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Receipt Settings"
          description="Control provider visibility and custom footer text on closed sales and payment receipt emails."
          valueLabel={receiptSummary}
          onEdit={() => {
            setReceiptDraft({
              showServiceProviderOnReceipt: data.showServiceProviderOnReceipt,
              receiptCustomFooterText: data.receiptCustomFooterText ?? "",
            });
            setReceiptDialogOpen(true);
          }}
          disabled={!canEdit}
        />
      </div>

      <Dialog open={customMethodsDialogOpen} onOpenChange={setCustomMethodsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom payment method labels</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="custom-payment-names">Labels</Label>
            <Input
              id="custom-payment-names"
              value={customMethodsInput}
              onChange={(event) => setCustomMethodsInput(event.target.value)}
              placeholder="PayPal, Venmo, Zelle"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated names. Each appears as a payment tile in staff checkout.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={updateMutation.isPending}
              onClick={() =>
                save({
                  customPaymentMethodNames:
                    parseCustomPaymentMethodNamesInput(customMethodsInput),
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tipButtonsDialogOpen} onOpenChange={setTipButtonsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tip buttons</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tip-percents">Preset percentages</Label>
              <Input
                id="tip-percents"
                value={tipPercentsInput}
                onChange={(event) => setTipPercentsInput(event.target.value)}
                placeholder="18, 20, 22"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated values from 1–100 (up to 5 presets).
              </p>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Hide tip buttons</span>
              <Switch
                checked={hideTipButtonsDraft}
                onCheckedChange={setHideTipButtonsDraft}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={updateMutation.isPending}
              onClick={() => {
                const percents = tipPercentsInput
                  .split(",")
                  .map((part) => parseInt(part.trim(), 10))
                  .filter((n) => Number.isFinite(n) && n >= 1 && n <= 100);
                save({
                  tipButtonPercents: percents.length > 0 ? percents : [18, 20, 22],
                  hideTipButtons: hideTipButtonsDraft,
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Require staff assignments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ["requireStaffForServices", "Services"],
                ["requireStaffForProducts", "Products"],
                ["requireStaffForGiftCards", "Gift cards"],
                ["requireStaffForPackages", "Packages"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium">{label}</span>
                <Switch
                  checked={staffSection.values?.[key] ?? false}
                  onCheckedChange={(checked) =>
                    staffSection.commit({ [key]: checked })
                  }
                  disabled={!canEdit}
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={updateMutation.isPending || !staffSection.values}
              onClick={() => {
                if (!staffSection.values) return;
                save(staffSection.values);
                setStaffDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt settings</DialogTitle>
          </DialogHeader>
          {receiptDraft ? (
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  Show service provider on receipt
                </span>
                <Switch
                  checked={receiptDraft.showServiceProviderOnReceipt}
                  onCheckedChange={(checked) =>
                    setReceiptDraft((current) =>
                      current
                        ? { ...current, showServiceProviderOnReceipt: checked }
                        : current,
                    )
                  }
                />
              </label>
              <div className="space-y-2">
                <Label htmlFor="receipt-footer">Custom footer text</Label>
                <Textarea
                  id="receipt-footer"
                  value={receiptDraft.receiptCustomFooterText}
                  onChange={(event) =>
                    setReceiptDraft((current) =>
                      current
                        ? {
                            ...current,
                            receiptCustomFooterText: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={4}
                  maxLength={500}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="brand"
              disabled={updateMutation.isPending || !receiptDraft}
              onClick={() => {
                if (!receiptDraft) return;
                save({
                  showServiceProviderOnReceipt:
                    receiptDraft.showServiceProviderOnReceipt,
                  receiptCustomFooterText:
                    receiptDraft.receiptCustomFooterText.trim() || null,
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsFormPage>
  );
}
