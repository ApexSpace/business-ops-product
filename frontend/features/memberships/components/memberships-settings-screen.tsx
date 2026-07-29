"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsCard } from "@/components/layout/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateMemberships } from "@/lib/query/invalidation";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import {
  getMembershipSettings,
  updateMembershipSettingsOnlineSales,
  updateMembershipPreferences,
} from "@/features/memberships/api/memberships.api";

type SettingsTab = "preferences" | "online-sales";

export function MembershipsSettingsScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>("preferences");

  const settingsQuery = useQuery({
    queryKey: queryKeys.memberships.settings(),
    queryFn: getMembershipSettings,
  });

  const settings = settingsQuery.data;
  const allowClientCancel = settings?.allowClientCancel ?? false;
  const onlineSalesEnabled = settings?.onlineSalesEnabled ?? false;

  const savePreferences = useMutation({
    mutationFn: (value: boolean) =>
      updateMembershipPreferences({ allowClientCancel: value }),
    onSuccess: async () => {
      toast.success("Preferences saved");
      await invalidateMemberships(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOnlineSales = useMutation({
    mutationFn: (value: boolean) =>
      updateMembershipSettingsOnlineSales({ onlineSalesEnabled: value }),
    onSuccess: async () => {
      toast.success("Online sales settings saved");
      await invalidateMemberships(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Membership Settings"
        description="Configure membership preferences and online sales."
        actions={
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/business/memberships" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Memberships
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-1">
          <button
            type="button"
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm",
              tab === "preferences"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
            onClick={() => setTab("preferences")}
          >
            Preferences
          </button>
          <button
            type="button"
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm",
              tab === "online-sales"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
            onClick={() => setTab("online-sales")}
          >
            Online Sales
          </button>
        </nav>

        <div className="space-y-6">
          {tab === "preferences" ? (
            <SettingsCard
              title="Client preferences"
              description="Control what clients can do with their memberships."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Allow clients to cancel memberships</Label>
                  <Switch
                    checked={allowClientCancel}
                    onCheckedChange={(v) => savePreferences.mutate(v)}
                  />
                </div>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "online-sales" ? (
            <>
              <SettingsCard
                title="Enable Online Sales"
                description="Allow clients to subscribe to memberships online through a direct link or website integration."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enabled</Label>
                    <Switch
                      checked={onlineSalesEnabled}
                      onCheckedChange={(v) => saveOnlineSales.mutate(v)}
                    />
                  </div>

                  {onlineSalesEnabled && settings && !settings.stripeReady ? (
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40">
                      <div className="flex gap-2 font-medium">
                        <Lock className="mt-0.5 size-4 shrink-0" />
                        Payment processing required
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Payment processing is required to use online memberships.{" "}
                        <Link
                          href="/business/settings/integrations"
                          className="text-primary underline"
                        >
                          Set up payment processing
                        </Link>
                      </p>
                    </div>
                  ) : null}

                  {settings?.shareableLink ? (
                    <div className="space-y-2">
                      <Label>Shareable link</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={settings.shareableLink} />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            void copyTextToClipboard(
                              settings.shareableLink!,
                              "Shareable link",
                            )
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </SettingsCard>

              {settings?.embedScript ? (
                <SettingsCard
                  title="Website Integration"
                  description="Sell memberships directly on your website in an overlay window."
                >
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">Step 1</p>
                      <p className="text-muted-foreground mb-2 text-sm">
                        Add this code to your website (copy & paste to HTML
                        header):
                      </p>
                      <div className="relative">
                        <Textarea
                          readOnly
                          rows={3}
                          value={settings.embedScript}
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            void copyTextToClipboard(
                              settings.embedScript!,
                              "Embed script",
                            )
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                    {settings.overlayLink ? (
                      <div>
                        <p className="mb-2 text-sm font-medium">Step 2</p>
                        <p className="text-muted-foreground mb-2 text-sm">
                          Use this link for buttons or links that open the
                          overlay:
                        </p>
                        <div className="flex gap-2">
                          <Input readOnly value={settings.overlayLink} />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              void copyTextToClipboard(
                                settings.overlayLink!,
                                "Overlay link",
                              )
                            }
                          >
                            <Copy className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SettingsCard>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
