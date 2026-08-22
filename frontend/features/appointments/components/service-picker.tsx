"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { listServices } from "@/features/settings/api/services.api";
import type { Service } from "@/features/settings/types";
import { queryKeys } from "@/lib/query/keys";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
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

export function ServicePicker({
  value,
  onChange,
  disabled = false,
  currencyCode = "USD",
  className,
}: ServicePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: servicesPage, isFetching } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const selectedIds = useMemo(
    () => new Set(value.map((line) => line.serviceId)),
    [value],
  );

  const availableServices = useMemo(() => {
    const items = servicesPage?.items ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((service) => {
      if (selectedIds.has(service.id)) return false;
      if (!term) return true;
      return service.name.toLowerCase().includes(term);
    });
  }, [servicesPage?.items, search, selectedIds]);

  const handleAdd = (service: Service) => {
    onChange([...value, serviceToSelection(service)]);
    setSearch("");
    setOpen(false);
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            DRAWER_FIELD_CONTROL_CLASS,
            "flex w-full items-center justify-between gap-2 border-input bg-transparent px-3 text-[13.5px] font-medium text-primary hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" />
            Add service
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--anchor-width)] p-0">
          <div className="border-b p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search services…"
              autoFocus
              className="h-9"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1" role="listbox">
            {isFetching ? (
              <div className="flex justify-center px-2 py-6">
                <LoadingState variant="inline" label="Loading services…" />
              </div>
            ) : availableServices.length === 0 ? (
              <EmptyState compact title="No services available" className="py-6" />
            ) : (
              availableServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  role="option"
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleAdd(service)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{service.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {service.durationMinutes} min
                      {service.price
                        ? ` · ${formatMoney(service.price, currencyCode)}`
                        : ""}
                    </span>
                  </span>
                  {selectedIds.has(service.id) ? (
                    <Check className="size-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
