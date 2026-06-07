"use client";

import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  canUsePublicBooking,
  copyBookingLink,
  openBookingPage,
} from "@/features/calendars/utils/calendar-booking-utils";
import { slugifyCalendarName } from "@/features/calendars/schemas/calendar-profile";
import { setCalendarPublicBooking } from "@/features/calendars/api/calendars.api";
import { toast } from "sonner";

interface CalendarCreatedSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: Calendar | null;
  onEnablePublicBooking?: (calendar: Calendar) => Promise<Calendar>;
  onContinueEditing: (id: string) => void;
  onBackToList: () => void;
}

export function CalendarCreatedSuccessDialog({
  open,
  onOpenChange,
  calendar,
  onEnablePublicBooking,
  onContinueEditing,
  onBackToList,
}: CalendarCreatedSuccessDialogProps) {
  if (!calendar) return null;

  const isPublic = canUsePublicBooking(calendar);

  async function handleEnablePublic() {
    const slug = slugifyCalendarName(calendar!.name);
    try {
      const updated = await setCalendarPublicBooking(calendar!.id, true, {
        publicSlug: slug,
        widgetSettings: {
          ...(calendar!.widgetSettings as object),
          bookingSlug: slug,
        },
      });
      toast.success("Public booking enabled");
      if (onEnablePublicBooking) {
        await onEnablePublicBooking(updated);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not enable booking");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Calendar created</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "Your calendar is ready. Share the booking link with customers."
              : "Enable public booking when you are ready to share this calendar."}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {isPublic ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void copyBookingLink(calendar)}
              >
                <Copy className="mr-2 size-4" />
                Copy booking link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openBookingPage(calendar)}
              >
                <ExternalLink className="mr-2 size-4" />
                Preview booking page
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => void handleEnablePublic()}>
              Enable public booking
            </Button>
          )}
        </DialogBody>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onBackToList}
          >
            Back to calendars
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onContinueEditing(calendar.id)}
          >
            Continue editing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
