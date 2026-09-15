"use client";

import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { cn } from "@/lib/utils";
import type { PublicBookingStaff } from "@/features/public-booking/schemas/public-booking";

interface BookingStaffPickerProps {
  serviceName: string;
  staff: PublicBookingStaff[];
  selectedStaffId: string | null;
  accentColor: string;
  loading?: boolean;
  showGenderOptions?: boolean;
  onBack: () => void;
  onSelectStaff: (staff: PublicBookingStaff) => void;
  onGenderFilter?: (filter: "FEMALE" | "MALE" | null) => void;
  genderFilter?: "FEMALE" | "MALE" | null;
}

export function BookingStaffPicker({
  serviceName,
  staff,
  selectedStaffId,
  accentColor,
  loading = false,
  showGenderOptions = false,
  onBack,
  onSelectStaff,
  onGenderFilter,
  genderFilter = null,
}: BookingStaffPickerProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <NavArrowIcon direction="left" size="lg" className="mr-1" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground">/</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {serviceName}
        </span>
      </div>

      {showGenderOptions && onGenderFilter ? (
        <div className="flex gap-2 border-b px-4 py-3 sm:px-6">
          <Button
            type="button"
            size="sm"
            variant={genderFilter === null ? "default" : "outline"}
            onClick={() => onGenderFilter(null)}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={genderFilter === "FEMALE" ? "default" : "outline"}
            onClick={() => onGenderFilter("FEMALE")}
          >
            Female only
          </Button>
          <Button
            type="button"
            size="sm"
            variant={genderFilter === "MALE" ? "default" : "outline"}
            onClick={() => onGenderFilter("MALE")}
          >
            Male only
          </Button>
        </div>
      ) : null}

      <div className="divide-y">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Loading staff…
          </p>
        ) : (
          staff.map((member) => (
            <button
              key={member.id}
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:px-6",
                selectedStaffId === member.id && "bg-muted/30",
              )}
              onClick={() => onSelectStaff(member)}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted"
                style={
                  member.isAnyone
                    ? { backgroundColor: `${accentColor}18`, color: accentColor }
                    : undefined
                }
              >
                <UserRound className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.availabilityLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                {member.price ? (
                  <span className="font-medium">${member.price}</span>
                ) : null}
                <NavArrowIcon direction="right" size="lg" className="text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
