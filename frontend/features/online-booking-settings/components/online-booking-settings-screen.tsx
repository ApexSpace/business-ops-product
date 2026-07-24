"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { AvoidGapsSettingsSection } from "@/features/online-booking-settings/components/avoid-gaps-settings-section";
import { useCan } from "@/features/auth/permissions";

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
    queryKey: ["online-booking-settings"],
    queryFn: getOnlineBookingSettings,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["online-booking-settings"] });

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
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const widget = (data.widgetSettings ?? {}) as Record<string, unknown>;
  const confirmation = (data.confirmationSettings ?? {}) as Record<string, unknown>;
  const form = (data.formSettings ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Online Booking</h1>
        <p className="text-sm text-muted-foreground">
          Manage your public booking link, preferences, and staff selection.
        </p>
      </div>

      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup & Integration</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="staff">Staff Selection</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Online booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
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

              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Express Booking
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Staff-started bookings completed by the client via a
                    completion link. Expired pending requests cancel
                    automatically, then soft-delete after 24 hours.
                  </p>
                </div>
                {(
                  [
                    ["expressBookingEnabled", "Enable Express Booking"],
                    [
                      "expressBookingAutoEnable",
                      "Automatically enable for new appointments",
                    ],
                    ["expressRequireCard", "Require a credit card to complete"],
                    [
                      "expressRequireDeposit",
                      "Require a payment or deposit to complete",
                    ],
                    [
                      "expressAllowPhotoUpload",
                      "Collect photos during Express Booking",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={Boolean(data[key])}
                      disabled={!canManage}
                      onCheckedChange={(v) =>
                        prefsMutation.mutate({ [key]: v })
                      }
                    />
                  </div>
                ))}
                {data.expressBookingEnabled ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Delivery channel (email or SMS) is configured under
                      Settings → Notifications.
                    </p>
                    <div className="space-y-2">
                      <Label>Time limit (minutes)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={1440}
                        defaultValue={data.expressBookingTimeLimitMinutes}
                        disabled={!canManage}
                        onBlur={(e) =>
                          prefsMutation.mutate({
                            expressBookingTimeLimitMinutes: Number(
                              e.target.value,
                            ),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        How long the client has to finish before the slot is
                        released. Policy version:{" "}
                        {data.cancellationPolicyVersion || "1"}
                      </p>
                    </div>
                  </div>
                ) : null}
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
                <Textarea
                  defaultValue={String(form.cancellationPolicyText ?? "")}
                  disabled={!canManage}
                  onBlur={(e) =>
                    prefsMutation.mutate({
                      formSettings: {
                        ...form,
                        cancellationPolicyText: e.target.value,
                        requirePolicyAgreement: Boolean(form.requirePolicyAgreement),
                      },
                    })
                  }
                />
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
