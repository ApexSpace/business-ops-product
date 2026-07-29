"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberServices,
  replaceTeamMemberServices,
} from "@/features/team/api/team.api";
import { queryKeys } from "@/lib/query/keys";

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

  const [draft, setDraft] = useState<Record<string, {
    enabled: boolean;
    duration: string;
    price: string;
    onlineBooking: boolean;
  }>>({});

  useEffect(() => {
    if (!data) return;
    const next: typeof draft = {};
    for (const category of data.categories) {
      for (const service of category.services) {
        next[service.id] = {
          enabled: service.isEnabled,
          duration: service.durationOverride
            ? String(service.durationOverride)
            : "",
          price: service.priceOverride ? String(service.priceOverride) : "",
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id} className="space-y-3">
          <h3 className="text-sm font-semibold">{category.name}</h3>
          {category.services.map((service) => {
            const row = draft[service.id];
            if (!row) return null;
            return (
              <Card key={service.id}>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.durationMinutes} min · ${String(service.price)}
                      </p>
                    </div>
                    <Switch
                      checked={row.enabled}
                      disabled={!canManage}
                      onCheckedChange={(enabled) =>
                        setDraft({ ...draft, [service.id]: { ...row, enabled } })
                      }
                    />
                  </div>
                  {row.enabled ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Duration override (min)"
                        value={row.duration}
                        onChange={(duration) =>
                          setDraft({
                            ...draft,
                            [service.id]: { ...row, duration },
                          })
                        }
                        disabled={!canManage}
                      />
                      <Field
                        label="Price override"
                        value={row.price}
                        onChange={(price) =>
                          setDraft({ ...draft, [service.id]: { ...row, price } })
                        }
                        disabled={!canManage}
                      />
                      <div className="flex items-center justify-between sm:col-span-2">
                        <Label className="font-normal">Online booking</Label>
                        <Switch
                          checked={row.onlineBooking}
                          disabled={!canManage}
                          onCheckedChange={(onlineBooking) =>
                            setDraft({
                              ...draft,
                              [service.id]: { ...row, onlineBooking },
                            })
                          }
                        />
                      </div>
                      {service.directBookingUrl ? (
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
                          <Copy className="mr-1 size-3" />
                          Direct link
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
      {canManage ? (
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          Save services
        </Button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
