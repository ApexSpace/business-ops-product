"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Package } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { AmountUnitToggle } from "@/components/ui/amount-unit-toggle";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberServices,
  replaceTeamMemberServices,
} from "@/features/team/api/team.api";
import { durationPresetItems } from "@/features/services/types/selection";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type ServiceDraft = {
  enabled: boolean;
  duration: string;
  price: string;
  commissionType: "FLAT" | "PERCENT";
  commissionValue: string;
  onlineBooking: boolean;
};

type Props = {
  userId: string;
  canManage: boolean;
};

export function MemberServicesTab({ userId, canManage }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberServices(userId),
    queryFn: () => getTeamMemberServices(userId),
  });

  const [draft, setDraft] = useState<Record<string, ServiceDraft>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, ServiceDraft> = {};
    for (const category of data.categories) {
      for (const service of category.services) {
        next[service.id] = {
          enabled: service.isEnabled,
          duration: service.durationOverride
            ? String(service.durationOverride)
            : String(service.durationMinutes),
          price: service.priceOverride
            ? String(service.priceOverride)
            : String(service.price ?? ""),
          commissionType:
            service.commissionType === "FLAT" ? "FLAT" : "PERCENT",
          commissionValue: service.commissionValue
            ? String(service.commissionValue)
            : "",
          onlineBooking: service.onlineBookingEnabled,
        };
      }
    }
    setDraft(next);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceTeamMemberServices(
        userId,
        Object.entries(draft).map(([serviceId, row]) => ({
          serviceId,
          isEnabled: row.enabled,
          durationMinutes: row.duration ? Number(row.duration) : null,
          price: row.price ? Number(row.price) : null,
          commissionType: row.commissionValue ? row.commissionType : null,
          commissionValue: row.commissionValue
            ? Number(row.commissionValue)
            : null,
          onlineBookingEnabled: row.onlineBooking,
        })),
      ),
    onSuccess: () => {
      toast.success("Service assignments saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberServices(userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const hasServices = useMemo(
    () => categories.some((category) => category.services.length > 0),
    [categories],
  );
  const baseDurationItems = durationPresetItems();

  const updateDraft = (serviceId: string, patch: Partial<ServiceDraft>) => {
    setDraft((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId]!, ...patch },
    }));
  };

  if (isLoading) {
    return <LoadingState variant="inline" />;
  }

  if (!hasServices) {
    return (
      <EmptyState
        compact
        icon={
          <Package className="size-4 text-muted-foreground/70" aria-hidden />
        }
        title="No services available"
        description="Create services in Settings before assigning them to this staff member."
        action={
          <Link
            href="/business/settings/services"
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Services
          </Link>
        }
      />
    );
  }

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      {categories.map((category) => (
        <section key={category.id} className="space-y-5">
          <h3 className={SETTINGS_GROUP_TITLE_CLASS}>{category.name}</h3>
          {category.services.map((service) => {
            const row = draft[service.id];
            if (!row) return null;
            return (
              <div
                key={service.id}
                className="space-y-4 border-b border-border/60 pb-6 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={row.enabled}
                    disabled={!canManage}
                    onCheckedChange={(enabled) =>
                      updateDraft(service.id, { enabled })
                    }
                    className={DRAWER_SWITCH_CLASS}
                    aria-label={`Enable ${service.name}`}
                  />
                  <p className="text-sm font-semibold text-violet-primary-dark">
                    {service.name}
                  </p>
                </div>

                {row.enabled ? (
                  <div className="space-y-4 pl-11">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <SearchableSelect
                        items={
                          baseDurationItems.some(
                            (item) => item.value === row.duration,
                          )
                            ? baseDurationItems
                            : [
                                ...baseDurationItems,
                                {
                                  value: row.duration,
                                  label: `${row.duration} min`,
                                },
                              ]
                        }
                        value={row.duration}
                        onValueChange={(value) =>
                          updateDraft(service.id, {
                            duration: value ?? row.duration,
                          })
                        }
                        placeholder="Select duration"
                        searchable={false}
                        disabled={!canManage}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min={0}
                        value={row.price}
                        disabled={!canManage}
                        placeholder="Enter price"
                        onChange={(e) =>
                          updateDraft(service.id, { price: e.target.value })
                        }
                      />
                    </div>

                    <Accordion multiple defaultValue={[]}>
                      <AccordionItem value="options" className="border-none">
                        <AccordionTrigger className="px-0 text-base font-medium text-violet-primary-normal hover:no-underline">
                          Additional Options
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-0">
                          <div className="space-y-2">
                            <Label>Commission</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={0}
                                className="flex-1"
                                value={row.commissionValue}
                                disabled={!canManage}
                                placeholder="Enter commission"
                                onChange={(e) =>
                                  updateDraft(service.id, {
                                    commissionValue: e.target.value,
                                  })
                                }
                              />
                              <AmountUnitToggle
                                value={row.commissionType}
                                currencyValue="FLAT"
                                percentValue="PERCENT"
                                disabled={!canManage}
                                onValueChange={(commissionType) =>
                                  updateDraft(service.id, { commissionType })
                                }
                                aria-label="Commission unit"
                              />
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <Label className="text-sm font-medium">
                                Enable in online booking
                              </Label>
                              <p
                                className={cn(
                                  SETTINGS_FORM_DESCRIPTION_CLASS,
                                  "text-xs",
                                )}
                              >
                                Allow this staff member to be booked online for
                                this service.
                              </p>
                            </div>
                            <Switch
                              checked={row.onlineBooking}
                              disabled={!canManage}
                              onCheckedChange={(onlineBooking) =>
                                updateDraft(service.id, { onlineBooking })
                              }
                              className={DRAWER_SWITCH_CLASS}
                            />
                          </div>

                          {service.directBookingUrl ? (
                            <div className="space-y-1">
                              <Label>Online Booking</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  void navigator.clipboard.writeText(
                                    service.directBookingUrl!,
                                  );
                                  toast.success("Link copied");
                                }}
                              >
                                <Copy className="mr-1 size-3" aria-hidden />
                                Direct Link
                              </Button>
                            </div>
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}

      {canManage ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="brand"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
