"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { GiftCardsSettingsSkeleton } from "@/features/gift-cards/components/gift-cards-settings-skeleton";
import type { GiftCardSettings } from "@/features/gift-cards/types";

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

function toOnlineSalesForm(settings: GiftCardSettings): OnlineSalesForm {
  return {
    enabled: settings.onlineSalesEnabled,
    purchaseDisclaimer: settings.purchaseDisclaimer ?? "",
    internalNotifyEmail: settings.internalNotifyEmail ?? "",
  };
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function GiftCardsSettingsScreen() {
  const [tab, setTab] = useState<TabId>("online-sales");
  /** Local edits; falls back to settings query data (no useEffect sync gate). */
  const [onlineSalesDraft, setOnlineSalesDraft] =
    useState<OnlineSalesForm | null>(null);
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
  const onlineSalesForm =
    onlineSalesDraft ?? (settings ? toOnlineSalesForm(settings) : null);

  const saveOnlineSales = useMutation({
    mutationFn: updateGiftCardOnlineSales,
    onSuccess: async () => {
      toast.success("Settings saved");
      setOnlineSalesDraft(null);
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
    const next = { ...onlineSalesForm, purchaseDisclaimer: disclaimerDraft,
};
    setOnlineSalesDraft(next);
    persistOnlineSales(next);
    setDisclaimerDialogOpen(false);
  }

  if (settingsQuery.isError) {
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
        <ApiErrorState
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (settingsQuery.isLoading && !settings) {
    return <GiftCardsSettingsSkeleton />;
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
          {tab === "online-sales" && !onlineSalesForm ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : null}

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
                        const next = { ...onlineSalesForm, enabled,
};
                        setOnlineSalesDraft(next);
                        persistOnlineSales(next);
                      }}
                    />
                  </div>

                  {onlineSalesForm.enabled && shareQuery.isLoading && !share ? (
                    <Skeleton className="h-20 w-full rounded-lg" />
                  ) : null}

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

                  {onlineSalesForm.enabled &&
                  share &&
                  !share.stripeReady ? (
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
                        setOnlineSalesDraft({
                          ...onlineSalesForm,
                          internalNotifyEmail: e.target.value,
                        })
                      }
                      onBlur={(e) => {
                        const next = {
                          ...onlineSalesForm,
                          internalNotifyEmail: e.target.value,
                        };
                        setOnlineSalesDraft(next);
                        persistOnlineSales(next);
                      }}
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
              <p className="mb-4 text-sm text-muted-foreground">
                Choose a design shown on online gift cards and in your workspace
                preview.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {settings.artworkPresets.map((preset) => {
                  const selected = settings.selectedArtworkKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={cn(
                        "group overflow-hidden rounded-xl border text-left transition-shadow",
                        selected
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-foreground/30",
                      )}
                      onClick={() => saveArtwork.mutate(preset.key)}
                    >
                      <div className="relative aspect-[1.6/1] w-full bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preset.imageUrl}
                          alt={preset.label}
                          className="absolute inset-0 size-full object-cover"
                        />
                        {selected ? (
                          <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <div className="border-t border-border/60 bg-background px-3 py-2">
                        <p className="text-sm font-medium">{preset.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {settings.artworkUrl ? (
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">Preview</p>
                  <div className="relative mx-auto aspect-[1.6/1] w-full max-w-md overflow-hidden rounded-xl border shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.artworkUrl}
                      alt="Selected gift card artwork"
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
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
            <Button type="button" variant="brand" onClick={saveDisclaimer}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
