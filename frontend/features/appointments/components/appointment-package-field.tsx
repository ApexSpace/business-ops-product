"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { listAvailableClientPackages } from "@/features/packages/api/packages.api";
import type { AppointmentFormValues } from "@/features/appointments/schemas/appointment-profile";

export function AppointmentPackageField() {
  const form = useFormContext<AppointmentFormValues>();
  const contactId = useWatch({ control: form.control, name: "contactId" });
  const serviceId = useWatch({ control: form.control, name: "serviceId" });

  const packagesQuery = useQuery({
    queryKey: ["appointment-packages", contactId, serviceId],
    queryFn: () => listAvailableClientPackages(contactId, serviceId!),
    enabled: Boolean(contactId && serviceId),
  });

  const packages = packagesQuery.data ?? [];
  if (!contactId || !serviceId || packages.length === 0) {
    return null;
  }

  return (
    <FormField
      control={form.control}
      name="clientPackageId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Use package</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value || "none"}
              onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="pkg-none" />
                <Label htmlFor="pkg-none">Pay normally</Label>
              </div>
              {packages.map((pkg) => (
                <div key={pkg.id} className="flex items-center gap-2">
                  <RadioGroupItem value={pkg.id} id={`pkg-${pkg.id}`} />
                  <Label htmlFor={`pkg-${pkg.id}`}>
                    {pkg.packageTemplate.emoji} {pkg.packageTemplate.name} (
                    {pkg.matchingRemaining} remaining)
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
