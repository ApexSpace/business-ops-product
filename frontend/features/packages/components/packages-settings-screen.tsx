"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { queryKeys } from "@/lib/query/keys";
import { invalidatePackages } from "@/lib/query/invalidation";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import {
  getPackageSettings,
  updatePackageSettings,
} from "@/features/packages/api/packages.api";

export function PackagesSettingsScreen() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);

  const settingsQuery = useQuery({
    queryKey: queryKeys.packages.settings(),
    queryFn: getPackageSettings,
  });

  const settings = settingsQuery.data;

  useEffect(() => {
    if (settings) setEnabled(settings.onlineSalesEnabled);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updatePackageSettings({ onlineSalesEnabled: enabled }),
    onSuccess: async () => {
      toast.success("Settings saved");
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Package Settings"
        description="Configure online package sales and website integration."
        actions={
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/business/packages" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Packages
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="space-y-1">
          <div className="bg-primary/10 text-primary rounded-md px-3 py-2 text-sm font-medium">
            Online Sales
          </div>
        </nav>

        <div className="space-y-6">
          <SettingsCard
            title="Enable Online Sales"
            description="Allow clients to buy packages online through a direct link, embedded on your website, or through online booking."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              {enabled && settings && !settings.stripeReady ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40">
                  <div className="flex gap-2 font-medium">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    Payment processing required
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Payment processing is required to use online packages.{" "}
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
                          settings.shareableLink,
                          "Link",
                        )
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </SettingsCard>

          {settings?.embedScript ? (
            <SettingsCard
              title="Website Integration"
              description="Sell packages directly on your website in an overlay window that appears when clicking a connected button or link."
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Step 1</p>
                  <p className="text-muted-foreground mb-2 text-sm">
                    Add this code to your website (copy & paste to HTML header):
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
                          settings.embedScript,
                          "Embed code",
                        )
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs italic">
                    If you have already added this code for embedded online
                    booking, this step is not needed.
                  </p>
                </div>
                {settings.overlayLink ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Step 2</p>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Use this link for buttons or links that open the overlay:
                    </p>
                    <div className="flex gap-2">
                      <Input readOnly value={settings.overlayLink} />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          void copyTextToClipboard(
                            settings.overlayLink,
                            "Link",
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
        </div>
      </div>
    </PageContainer>
  );
}
