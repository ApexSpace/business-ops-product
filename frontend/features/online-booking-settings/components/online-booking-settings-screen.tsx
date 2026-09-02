"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/data-display/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getOnlineBookingSettings,
  updateOnlineBookingPreferences,
  updateOnlineBookingSetup,
  updateOnlineBookingStaffSelection,
} from "@/features/online-booking-settings/api/online-booking-settings.api";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import { AvoidGapsSettingsSection } from "@/features/online-booking-settings/components/avoid-gaps-settings-section";
import { invalidateOnlineBookingSettings } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy");
  }
}

export function OnlineBookingSettingsScreen() {
  const canManage = useCan("settings.business");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.onlineBookingSettings.detail(),
    queryFn: getOnlineBookingSettings,
  });

  const invalidate = () => invalidateOnlineBookingSettings(queryClient);

  const setupMutation = useMutation({
    mutationFn: updateOnlineBookingSetup,
    onSuccess: () => {
      invalidate();
      toast.success("Setup saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prefsMutation = useMutation({
    mutationFn: updateOnlineBookingPreferences,
    onSuccess: () => {
      invalidate();
      toast.success("Preferences saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const staffMutation = useMutation({
    mutationFn: updateOnlineBookingStaffSelection,
    onSuccess: () => {
      invalidate();
      toast.success("Staff selection saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <LoadingState variant="inline" />;
  }

  const widget = (data.widgetSettings ?? {}) as Record<string, unknown>;
  const confirmation = (data.confirmationSettings ?? {}) as Record<string, unknown>;
  const form = (data.formSettings ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-[var(--spacing-6)]">
      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup & Integration</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="staff">Staff Selection</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="ob-enabled">Enabled</Label>
                <Switch
                  id="ob-enabled"
                  checked={data.onlineBookingEnabled}
                  disabled={!canManage}
                  onCheckedChange={(enabled) =>
                    setupMutation.mutate({ onlineBookingEnabled: enabled })
                  }
                />
              </div>
              {data.publicBookingUrl ? (
                <div className="space-y-2">
                  <Label>Booking link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={data.publicBookingUrl} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        void copyText(data.publicBookingUrl!, "Booking link")
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        window.open(data.publicBookingUrl!, "_blank")
                      }
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Website integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable embed</Label>
                <Switch
                  checked={data.embedEnabled}
                  disabled={!canManage}
                  onCheckedChange={(embedEnabled) =>
                    setupMutation.mutate({ embedEnabled })
                  }
                />
              </div>
              {data.embedCode ? (
                <>
                  <Textarea readOnly rows={5} value={data.embedCode} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText(data.embedCode!, "Embed code")}
                  >
                    <Copy className="mr-1 size-4" />
                    Copy embed code
                  </Button>
                </>
              ) : null}
              {data.overlayUrl ? (
                <div className="space-y-2">
                  <Label>Overlay link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={data.overlayUrl} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void copyText(data.overlayUrl!, "Overlay link")}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add script: /booking-overlay.js and use this URL on booking buttons.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <SettingsFormGrid>
                <div>
                  <Label>Maximum advance booking (days)</Label>
                  <Input
                    type="number"
                    defaultValue={data.maxBookingDays}
                    disabled={!canManage}
                    onBlur={(e) =>
                      prefsMutation.mutate({
                        maxBookingDays: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Minimum prior notice (minutes)</Label>
                  <Input
                    type="number"
                    defaultValue={data.minimumNoticeMinutes}
                    disabled={!canManage}
                    onBlur={(e) =>
                      prefsMutation.mutate({
                        minimumNoticeMinutes: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Slot interval (minutes)</Label>
                  <Input
                    type="number"
                    defaultValue={data.slotIntervalMinutes}
                    disabled={!canManage}
                    onBlur={(e) =>
                      prefsMutation.mutate({
                        slotIntervalMinutes: Number(e.target.value),
                      })
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Minimum spacing between offered start times. Buffer and
                    processing time come from each service&apos;s settings.
                  </p>
                </div>
              </SettingsFormGrid>
              <AvoidGapsSettingsSection
                data={data}
                disabled={!canManage}
                onSave={(body) => prefsMutation.mutate(body)}
              />
              {[
                ["allowMultipleServices", "Allow multiple services"],
                ["allowDuplicateServices", "Allow booking same service multiple times"],
                ["singleStaffOnly", "Only allow single staff member"],
                ["waitlistEnabled", "Allow clients to join waitlist"],
                ["collectPhotosEnabled", "Collect photos during booking"],
                ["showBookForSomeoneElse", "Show book for someone else"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={
                      key === "showBookForSomeoneElse"
                        ? form.showBookForSomeoneElse !== false
                        : Boolean(data[key as keyof typeof data])
                    }
                    disabled={!canManage}
                    onCheckedChange={(v) =>
                      key === "showBookForSomeoneElse"
                        ? prefsMutation.mutate({
                            formSettings: {
                              ...form,
                              showBookForSomeoneElse: v,
                            },
                          })
                        : prefsMutation.mutate({ [key]: v })
                    }
                  />
                </div>
              ))}

              <div className="space-y-2 rounded-lg border border-border/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Express Booking
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Staff-started bookings completed by the client via a
                    completion link.
                  </p>
                </div>
                <Link
                  href="/business/settings/express-booking"
                  className="inline-flex text-sm text-primary underline-offset-2 hover:underline"
                >
                  Configure Express Booking in Calendar &amp; Appointments →
                  Express Booking
                </Link>
              </div>

              {data.collectPhotosEnabled ? (
                <div className="space-y-2">
                  <Label>Photo upload prompt</Label>
                  <Textarea
                    defaultValue={String(data.photoUploadPrompt ?? "")}
                    placeholder="Please share any reference or inspiration photos that are relevant to your appointment."
                    disabled={!canManage}
                    onBlur={(e) =>
                      prefsMutation.mutate({
                        photoUploadPrompt: e.target.value.trim() || null,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown on the booking confirmation page. Clients can upload up
                    to 3 photos.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Cancellation policy</Label>
                <p className="text-sm text-muted-foreground">
                  Edit the cancellation policy in{" "}
                  <Link
                    href="/business/settings/cancel-reschedule"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Cancel & Reschedule settings
                  </Link>
                  .
                </p>
              </div>
              <div className="space-y-2">
                <Label>Success message</Label>
                <Textarea
                  defaultValue={String(confirmation.successMessage ?? "")}
                  disabled={!canManage}
                  onBlur={(e) =>
                    prefsMutation.mutate({
                      confirmationSettings: {
                        ...confirmation,
                        successMessage: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {[
                ["randomizeStaffOrder", "Randomize staff order"],
                ["showGenderOptions", "Show gender options"],
                ["showAnyoneOption", 'Show "Anyone" option'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={Boolean(data[key as keyof typeof data])}
                    disabled={!canManage}
                    onCheckedChange={(v) =>
                      staffMutation.mutate({ [key]: v })
                    }
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Anyone assignment mode</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue={data.anyoneAssignmentMode}
                  disabled={!canManage}
                  onChange={(e) =>
                    staffMutation.mutate({
                      anyoneAssignmentMode: e.target.value,
                    })
                  }
                >
                  <option value="RANDOM">Randomly</option>
                  <option value="ORDER">By staff order</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
