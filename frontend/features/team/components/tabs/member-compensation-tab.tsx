"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getTeamMemberCompensation,
  updateTeamMemberCompensation,
  type StaffCompensation,
} from "@/features/team/api/team.api";
import { queryKeys } from "@/lib/query/keys";

type Props = {
  userId: string;
  role: string;
  canManage: boolean;
};

export function MemberCompensationTab({ userId, role, canManage }: Props) {
  const queryClient = useQueryClient();
  const isAdmin = role === "ADMIN" || role === "OWNER";

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.memberCompensation(userId),
    queryFn: () => getTeamMemberCompensation(userId),
  });

  const [form, setForm] = useState<StaffCompensation>({
    serviceCommissionEnabled: false,
    serviceCommissionMode: null,
    serviceCommissionPercent: null,
    productCommissionEnabled: false,
    productCommissionPercent: null,
    productCommissionOverridesEnabled: false,
    hourlyEnabled: false,
    hourlyRate: null,
    greaterOfEnabled: false,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateTeamMemberCompensation(userId, form),
    onSuccess: () => {
      toast.success("Compensation saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.memberCompensation(userId),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Compensation settings apply to Normal staff members only.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Service commission</CardTitle>
          <Switch
            checked={form.serviceCommissionEnabled}
            disabled={!canManage}
            onCheckedChange={(serviceCommissionEnabled) =>
              setForm({ ...form, serviceCommissionEnabled })
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Basic percentage of service sales.
          </p>
          <div className="space-y-1">
            <Label>Default percentage</Label>
            <Input
              type="number"
              min={0}
              max={100}
              disabled={!canManage || !form.serviceCommissionEnabled}
              value={form.serviceCommissionPercent ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  serviceCommissionPercent: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Product commission</CardTitle>
          <Switch
            checked={form.productCommissionEnabled}
            disabled={!canManage}
            onCheckedChange={(productCommissionEnabled) =>
              setForm({ ...form, productCommissionEnabled })
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Default percentage</Label>
            <Input
              type="number"
              min={0}
              max={100}
              disabled={!canManage || !form.productCommissionEnabled}
              value={form.productCommissionPercent ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  productCommissionPercent: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Enable commission overrides</Label>
            <Switch
              checked={form.productCommissionOverridesEnabled}
              disabled={!canManage || !form.productCommissionEnabled}
              onCheckedChange={(productCommissionOverridesEnabled) =>
                setForm({ ...form, productCommissionOverridesEnabled })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Hourly</CardTitle>
          <Switch
            checked={form.hourlyEnabled}
            disabled={!canManage}
            onCheckedChange={(hourlyEnabled) =>
              setForm({ ...form, hourlyEnabled })
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Amount per hour</Label>
            <Input
              type="number"
              min={0}
              disabled={!canManage || !form.hourlyEnabled}
              value={form.hourlyRate ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  hourlyRate: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Enable greater-of calculation</Label>
            <Switch
              checked={form.greaterOfEnabled}
              disabled={!canManage || !form.hourlyEnabled}
              onCheckedChange={(greaterOfEnabled) =>
                setForm({ ...form, greaterOfEnabled })
              }
            />
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          Save compensation
        </Button>
      ) : null}
    </div>
  );
}
