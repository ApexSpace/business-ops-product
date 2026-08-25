"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { listServices } from "@/features/settings/api/services.api";
import type { Service } from "@/features/settings/types";
import { queryKeys } from "@/lib/query/keys";
import { formatMoney } from "@/features/payments/utils/currencies";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { IconButton } from "@/components/ui/icon-button";
import { DRAWER_FIELD_CONTROL_CLASS } from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

export interface ServicePickerSelection {
  serviceId: string;
  name: string;
  durationMinutes: number;
  price: string | null;
}

export interface ServicePickerProps {
  value: ServicePickerSelection[];
  onChange: (services: ServicePickerSelection[]) => void;
  disabled?: boolean;
  currencyCode?: string;
  className?: string;
}

function serviceToSelection(service: Service): ServicePickerSelection {
  return {
    serviceId: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
  };
}

function servicePickerLabel(service: Service, currencyCode: string) {
  const meta = [
    `${service.durationMinutes} min`,
    service.price ? formatMoney(service.price, currencyCode) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return meta ? `${service.name} — ${meta}` : service.name;
}

export function ServicePicker({
  value,
  onChange,
  disabled = false,
  currencyCode = "USD",
  className,
}: ServicePickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: servicesPage, isFetching } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: pickerOpen || value.length === 0,
  });

  const selectedIds = useMemo(
    () => new Set(value.map((line) => line.serviceId)),
    [value],
  );

  const items = useMemo(
    () =>
      (servicesPage?.items ?? [])
        .filter((service) => !selectedIds.has(service.id))
        .map((service) => ({
          value: service.id,
          label: servicePickerLabel(service, currencyCode),
        })),
    [servicesPage?.items, selectedIds, currencyCode],
  );

  const handleAdd = (serviceId: string | null) => {
    if (!serviceId) return;
    const service = (servicesPage?.items ?? []).find((item) => item.id === serviceId);
    if (!service) return;
    onChange([...value, serviceToSelection(service)]);
  };

  const handleRemove = (serviceId: string) => {
    onChange(value.filter((line) => line.serviceId !== serviceId));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {value.length > 0 ? (
        <ul className="divide-y divide-border/50 rounded-[var(--radius-md)] border-[1.5px] border-border/80">
          {value.map((line) => (
            <li
              key={line.serviceId}
              className="flex items-center gap-3 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">
                  {line.name}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  {line.durationMinutes} min
                  {line.price
                    ? ` · ${formatMoney(line.price, currencyCode)}`
                    : ""}
                </p>
              </div>
              <IconButton
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => handleRemove(line.serviceId)}
                aria-label={`Remove ${line.name}`}
                className="rounded-[var(--radius-md)] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <X className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">No services selected</p>
      )}

      {pickerOpen ? (
        <SearchableSelect
          items={items}
          value={null}
          onValueChange={(id) => {
            handleAdd(id);
            setPickerOpen(false);
          }}
          placeholder="Search services…"
          emptyMessage={isFetching ? "Loading services…" : "No services available"}
          disabled={disabled}
          triggerClassName={cn(DRAWER_FIELD_CONTROL_CLASS, "font-normal")}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setPickerOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          className={cn(
            DRAWER_FIELD_CONTROL_CLASS,
            "flex w-full items-center gap-2 border-input bg-transparent px-3 text-[13.5px] font-medium text-primary hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="size-4" />
          Add service
        </button>
      )}
    </div>
  );
}
