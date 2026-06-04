"use client";

import {
  CalendarClock,
  Users,
  GraduationCap,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CALENDAR_CREATION_TYPES,
  type CalendarCreationTypeId,
  type CalendarCreationTypeOption,
} from "@/features/calendars/schemas/calendar-profile";

const TYPE_ICONS: Record<CalendarCreationTypeId, LucideIcon> = {
  personal: CalendarClock,
  round_robin: Users,
  class: GraduationCap,
  collective: UsersRound,
};

interface CalendarTypePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTypeId: CalendarCreationTypeId | null;
  onSelectType: (type: CalendarCreationTypeOption) => void;
  onContinue: () => void;
}

export function CalendarTypePickerDialog({
  open,
  onOpenChange,
  selectedTypeId,
  onSelectType,
  onContinue,
}: CalendarTypePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose calendar type</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pick how appointments are scheduled. You can change details later.
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 sm:grid-cols-2">
            {CALENDAR_CREATION_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type.id];
              const selected = selectedTypeId === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelectType(type)}
                  className={cn(
                    "flex flex-col rounded-xl border p-4 text-left transition-colors",
                    "hover:border-primary/40 hover:bg-muted/40",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/80 bg-card",
                  )}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{type.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      Examples:{" "}
                    </span>
                    {type.examples.join(" · ")}
                  </p>
                </button>
              );
            })}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!selectedTypeId} onClick={onContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
