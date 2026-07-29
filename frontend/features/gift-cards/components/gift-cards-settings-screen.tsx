"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsCard } from "@/components/layout/settings-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateGiftCards } from "@/lib/query/invalidation";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import {
  createGiftCardPromotion,
  deleteGiftCardPromotion,
  getGiftCardOnlineSalesShare,
  getGiftCardSettings,
  listGiftCardPromotions,
  updateGiftCardArtwork,
  updateGiftCardOnlineSales,
  updateGiftCardPreferences,
} from "@/features/gift-cards/api/gift-cards.api";

const TABS = [
  { id: "online-sales", label: "Online Sales" },
  { id: "artwork", label: "Artwork" },
  { id: "preferences", label: "Preferences" },
  { id: "promotions", label: "Promotions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type OnlineSalesForm = {
  enabled: boolean;
  purchaseDisclaimer: string;
  internalNotifyEmail: string;
};

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function GiftCardsSettingsScreen() {
  const [tab, setTab] = useState<TabId>("online-sales");
  const [onlineSalesForm, setOnlineSalesForm] = useState<OnlineSalesForm | null>(
    null,
  );
  const [disclaimerDialogOpen, setDisclaimerDialogOpen] = useState(false);
  const [disclaimerDraft, setDisclaimerDraft] = useState("");
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.giftCards.settings(),
    queryFn: getGiftCardSettings,
  });

  const shareQuery = useQuery({
    queryKey: queryKeys.giftCards.onlineSalesShare(),
    queryFn: getGiftCardOnlineSalesShare,
  });

  const promotionsQuery = useQuery({
    queryKey: queryKeys.giftCards.promotions(),
    queryFn: listGiftCardPromotions,
  });

  const settings = settingsQuery.data;
  const share = shareQuery.data;

  useEffect(() => {
    if (!settings) return;
    setOnlineSalesForm({
      enabled: settings.onlineSalesEnabled,
      purchaseDisclaimer: settings.purchaseDisclaimer ?? "",
      internalNotifyEmail: settings.internalNotifyEmail ?? "",
    });
  }, [settings]);

  const saveOnlineSales = useMutation({
    mutationFn: updateGiftCardOnlineSales,
    onSuccess: async () => {
      toast.success("Settings saved");
      await invalidateGiftCards(queryClient);
      await shareQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePreferences = useMutation({
    mutationFn: (autoGenerateNumber: boolean) =>
      updateGiftCardPreferences(autoGenerateNumber),
    onSuccess: async () => {
      toast.success("Preferences saved");
      await invalidateGiftCards(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveArtwork = useMutation({
    mutationFn: updateGiftCardArtwork,
    onSuccess: async () => {
      toast.success("Artwork updated");
      await invalidateGiftCards(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function persistOnlineSales(next: OnlineSalesForm) {
    if (!isValidEmail(next.internalNotifyEmail)) {
      toast.error("Internal notification email must be a valid email address");
      return;
    }
    const email = next.internalNotifyEmail.trim();
    saveOnlineSales.mutate({
      enabled: next.enabled,
      purchaseDisclaimer: next.purchaseDisclaimer,
      ...(email ? { internalNotifyEmail: email } : {}),
    });
  }

  function openDisclaimerEditor() {
    setDisclaimerDraft(onlineSalesForm?.purchaseDisclaimer ?? "");
    setDisclaimerDialogOpen(true);
  }

  function saveDisclaimer() {
    if (!onlineSalesForm) return;
    const next = { ...onlineSalesForm, purchaseDisclaimer: disclaimerDraft };
    setOnlineSalesForm(next);
    persistOnlineSales(next);
    setDisclaimerDialogOpen(false);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gift Card Settings"
        description="Configure online sales, artwork, numbering, and promotions."
        actions={
          <Link
            href="/business/gift-cards"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Gift Cards
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm",
                tab === item.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {tab === "online-sales" && onlineSalesForm ? (
            <>
              <SettingsCard title="Online Sales">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Allow clients to purchase gift cards through a direct link
                    or embedded on your website.
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Enabled</p>
                    <Switch
                      checked={onlineSalesForm.enabled}
                      onCheckedChange={(enabled) => {
                        const next = { ...onlineSalesForm, enabled };
                        setOnlineSalesForm(next);
                        persistOnlineSales(next);
                      }}
                    />
                  </div>

                  {onlineSalesForm.enabled && share?.hostedPageUrl ? (
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                      <Label className="text-sm font-medium">
                        Gift cards link for sharing
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={share.hostedPageUrl}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            void copyTextToClipboard(
                              share.hostedPageUrl,
                              "Gift card link",
                            )
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          nativeButton={false}
                          render={
                            <a
                              href={share.hostedPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {onlineSalesForm.enabled && !share?.stripeReady ? (
                    <div className="flex gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm">
                      <Lock className="mt-0.5 size-4 shrink-0 text-violet-700 dark:text-violet-300" />
                      <div>
                        <p className="font-medium text-violet-900 dark:text-violet-200">
                          Payment processing required
                        </p>
                        <p className="text-violet-800 dark:text-violet-300">
                          Payment processing is required to use Online Gift
                          Cards.{" "}
                          <Link
                            href="/business/settings/integrations"
                            className="font-medium underline"
                          >
                            Sign up for payment processing
                          </Link>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <Label>Internal notification email</Label>
                    <Input
                      type="email"
                      value={onlineSalesForm.internalNotifyEmail}
                      onChange={(e) =>
                        setOnlineSalesForm({
                          ...onlineSalesForm,
                          internalNotifyEmail: e.target.value,
                        })
                      }
                      onBlur={() => persistOnlineSales(onlineSalesForm)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard title="Purchase Disclaimer">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      Add a message clients will see before they buy a gift card
                      online. Use this for refund terms, expiration details, or
                      other policies.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openDisclaimerEditor}
                    >
                      <Pencil className="mr-1 size-4" />
                      Edit
                    </Button>
                  </div>
                  {onlineSalesForm.purchaseDisclaimer ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      {onlineSalesForm.purchaseDisclaimer}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No disclaimer set.
                    </p>
                  )}
                </div>
              </SettingsCard>

              {onlineSalesForm.enabled && share?.embedCode ? (
                <SettingsCard title="Website Integration">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Integrate online sales of gift cards directly on your
                      website as an embedded frame, allowing clients to buy a
                      gift card without leaving your website.
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Embed code (copy &amp; paste into your website)
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void copyTextToClipboard(
                              share.embedCode,
                              "Embed code",
                            )
                          }
                        >
                          <Copy className="mr-1 size-4" />
                          Copy
                        </Button>
                      </div>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                        {share.embedCode}
                      </pre>
                    </div>

                    {share.embedUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={share.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="mr-1 size-4" />
                        Preview embed
                      </Button>
                    ) : null}
                  </div>
                </SettingsCard>
              ) : null}
            </>
          ) : null}

          {tab === "artwork" && settings ? (
            <SettingsCard title="Selected Artwork">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {settings.artworkPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={cn(
                      "rounded-lg border p-4 text-left text-sm",
                      settings.selectedArtworkKey === preset.key &&
                        "border-primary ring-2 ring-primary",
                    )}
                    onClick={() => saveArtwork.mutate(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </SettingsCard>
          ) : null}

          {tab === "preferences" && settings ? (
            <SettingsCard title="Gift Card Numbers">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Automatically generate gift card number</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a 6-digit number when selling gift cards.
                  </p>
                </div>
                <Switch
                  checked={settings.autoGenerateNumber}
                  onCheckedChange={(checked) => savePreferences.mutate(checked)}
                />
              </div>
            </SettingsCard>
          ) : null}

          {tab === "promotions" ? (
            <SettingsCard title="Promotions">
              <div className="space-y-3">
                {(promotionsQuery.data ?? []).map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{promo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${promo.cardValue} value for ${promo.salePrice}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteGiftCardPromotion(promo.id).then(() =>
                          promotionsQuery.refetch(),
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    const name = prompt("Promotion name");
                    const cardValue = prompt("Card value", "100");
                    const salePrice = prompt("Sale price", "100");
                    if (!name || !cardValue || !salePrice) return;
                    void createGiftCardPromotion({
                      name,
                      cardValue: Number(cardValue),
                      salePrice: Number(salePrice),
                      startDate: new Date().toISOString(),
                    }).then(() => promotionsQuery.refetch());
                  }}
                >
                  Add a promotion
                </Button>
              </div>
            </SettingsCard>
          ) : null}
        </div>
      </div>

      <Dialog open={disclaimerDialogOpen} onOpenChange={setDisclaimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase disclaimer</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Textarea
              rows={6}
              value={disclaimerDraft}
              onChange={(e) => setDisclaimerDraft(e.target.value)}
              placeholder="Enter terms, refund policy, or other information clients should see before purchasing."
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisclaimerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveDisclaimer}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
