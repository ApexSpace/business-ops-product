"use client";

import { useMemo } from "react";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  buildEmbedCode,
  resolvePublicBookingUrl,
  resolvePublicEmbedUrl,
} from "@/features/public-booking/utils/booking-url";
import { slugifyCalendarName } from "@/features/calendars/schemas/calendar-profile";
import type { CalendarEditSectionProps } from "@/features/calendars/components/edit/calendar-edit-types";

export function CalendarEditBookingLinkSection({
  form,
  detail,
}: CalendarEditSectionProps) {
  const calendarName = form.watch("name");
  const publicSlug = useMemo(
    () => slugifyCalendarName(calendarName || detail?.name || ""),
    [calendarName, detail?.name],
  );

  const publicBookingEnabled = form.watch("publicBookingEnabled");
  const embedEnabled = form.watch("embedEnabled");
  const bookingUrl = publicSlug ? resolvePublicBookingUrl(publicSlug) : "";
  const embedUrl = publicSlug ? resolvePublicEmbedUrl(publicSlug) : "";
  const embedCode = publicSlug && embedEnabled ? buildEmbedCode(publicSlug) : "";

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Public booking</h3>
          <p className="text-sm text-muted-foreground">
            Share your booking link or embed the scheduler on your website.
          </p>
        </div>

        {bookingUrl ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <Label className="text-sm font-medium">Booking URL</Label>
            <p className="break-all text-sm font-mono text-muted-foreground">
              {bookingUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void copyText(bookingUrl, "Booking link")}
              >
                <Copy className="mr-1 size-4" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(bookingUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="mr-1 size-4" />
                Open page
              </Button>
              {publicBookingEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(bookingUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Preview booking page
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="publicBookingEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div>
                <FormLabel>Enable public booking</FormLabel>
                <FormDescription>
                  When disabled, your public link will not accept new bookings.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {publicSlug ? (
          <p className="text-sm text-muted-foreground">
            Your booking link is generated automatically from the calendar name.
          </p>
        ) : null}

      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Embed widget</h3>
          <p className="text-sm text-muted-foreground">
            Paste this iframe on your website so visitors can book without
            leaving your site.
          </p>
        </div>

        <FormField
          control={form.control}
          name="embedEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div>
                <FormLabel>Enable embed</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {embedEnabled && embedCode ? (
          <div className="space-y-2">
            <Label className="text-sm">Embed code</Label>
            <Textarea readOnly rows={6} value={embedCode} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(embedCode, "Embed code")}
              >
                <Copy className="mr-1 size-4" />
                Copy embed code
              </Button>
              {embedUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(embedUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Preview embed
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Branding</h3>
        <FormField
          control={form.control}
          name="widgetSettings"
          render={() => (
            <FormItem>
              <FormLabel>Brand color</FormLabel>
              <FormControl>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={
                      (
                        form.watch("widgetSettings") as {
                          theme?: { primaryColor?: string };
                        }
                      )?.theme?.primaryColor ??
                      form.watch("color") ??
                      "#0069ff"
                    }
                    onChange={(e) =>
                      form.setValue("widgetSettings", {
                        ...(form.getValues("widgetSettings") ?? {}),
                        theme: {
                          ...(
                            form.getValues("widgetSettings") as {
                              theme?: Record<string, unknown>;
                            }
                          )?.theme,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Used on buttons and highlights on your booking page.
                  </p>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <p className="text-sm text-muted-foreground">
          Logo comes from business settings when configured. Brand color drives
          buttons and highlights on the public booking page.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Public page content</h3>
        <FormField
          control={form.control}
          name="widgetSettings"
          render={() => (
            <FormItem>
              <FormLabel>Public title</FormLabel>
              <FormControl>
                <Input
                  value={
                    (form.watch("widgetSettings") as { title?: string })?.title ??
                    ""
                  }
                  onChange={(e) =>
                    form.setValue("widgetSettings", {
                      ...(form.getValues("widgetSettings") ?? {}),
                      title: e.target.value,
                    })
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public description</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="widgetSettings"
          render={() => (
            <FormItem>
              <FormLabel>Booking button text</FormLabel>
              <FormControl>
                <Input
                  value={
                    (form.watch("widgetSettings") as { buttonText?: string })
                      ?.buttonText ?? ""
                  }
                  onChange={(e) =>
                    form.setValue("widgetSettings", {
                      ...(form.getValues("widgetSettings") ?? {}),
                      buttonText: e.target.value,
                    })
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmationSettings"
          render={() => (
            <FormItem>
              <FormLabel>Success message</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  value={
                    (
                      form.watch("confirmationSettings") as {
                        successMessage?: string;
                      }
                    )?.successMessage ?? ""
                  }
                  onChange={(e) =>
                    form.setValue("confirmationSettings", {
                      ...(form.getValues("confirmationSettings") ?? {}),
                      successMessage: e.target.value,
                    })
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmationSettings"
          render={() => (
            <FormItem>
              <FormLabel>Redirect after booking URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://yoursite.com/thank-you"
                  value={
                    (
                      form.watch("confirmationSettings") as {
                        redirectUrl?: string;
                      }
                    )?.redirectUrl ?? ""
                  }
                  onChange={(e) =>
                    form.setValue("confirmationSettings", {
                      ...(form.getValues("confirmationSettings") ?? {}),
                      redirectUrl: e.target.value,
                    })
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-medium">Booking form</h3>
        <FormField
          control={form.control}
          name="formSettings"
          render={() => (
            <div className="space-y-3">
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <Checkbox
                  id="requireEmail"
                  checked={Boolean(
                    (form.watch("formSettings") as { requireEmail?: boolean })
                      ?.requireEmail,
                  )}
                  onCheckedChange={(v) =>
                    form.setValue("formSettings", {
                      ...(form.getValues("formSettings") ?? {}),
                      requireEmail: Boolean(v),
                    })
                  }
                />
                <Label htmlFor="requireEmail">Require email</Label>
              </FormItem>
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <Checkbox
                  id="requirePhone"
                  checked={Boolean(
                    (form.watch("formSettings") as { requirePhone?: boolean })
                      ?.requirePhone,
                  )}
                  onCheckedChange={(v) =>
                    form.setValue("formSettings", {
                      ...(form.getValues("formSettings") ?? {}),
                      requirePhone: Boolean(v),
                    })
                  }
                />
                <Label htmlFor="requirePhone">Require phone</Label>
              </FormItem>
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <Checkbox
                  id="showNotes"
                  checked={
                    (form.watch("formSettings") as { showNotes?: boolean })
                      ?.showNotes !== false
                  }
                  onCheckedChange={(v) =>
                    form.setValue("formSettings", {
                      ...(form.getValues("formSettings") ?? {}),
                      showNotes: Boolean(v),
                    })
                  }
                />
                <Label htmlFor="showNotes">Show notes field</Label>
              </FormItem>
            </div>
          )}
        />
        <p className="text-sm text-muted-foreground">
          Duration, buffers, and weekly hours are configured in the Availability
          tab.
        </p>
      </section>
    </div>
  );
}
