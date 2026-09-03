"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityDetailTabs } from "@/components/layout/entity-detail-tabs";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { queryKeys } from "@/lib/query/keys";
import { invalidateServiceWorkspace } from "@/lib/query/invalidation";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { deleteService } from "@/features/settings/api/services.api";
import { ServiceDetailsSection } from "@/features/services/components/settings/service-details-section";
import { ServiceStaffSection } from "@/features/services/components/settings/service-staff-section";
import { ServiceResourcesSection } from "@/features/services/components/settings/service-resources-section";
import { ServiceOnlineBookingSection } from "@/features/services/components/settings/service-online-booking-section";
import {
  createOptionGroup,
  createResourceRequirement,
  createServiceOption,
  deleteOptionGroup,
  deleteResourceRequirement,
  deleteServiceOption,
  getServiceDirectLinks,
  getServiceWorkspace,
  patchServiceDetails,
  patchServiceOnlineBooking,
  replaceServiceProducts,
  replaceServiceStaff,
  updateResourceRequirement,
} from "@/features/services/api/service-workspace.api";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type Props = {
  serviceId: string;
  durationPresets: number[];
  onUpdated: () => void;
  onDeleted?: () => void;
};

export function ServiceWorkspacePanel({
  serviceId,
  durationPresets,
  onUpdated,
  onDeleted,
}: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("details");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.services.workspace(serviceId),
    queryFn: () => getServiceWorkspace(serviceId),
  });

  const { data: membersData } = useQuery({
    queryKey: queryKeys.business.members({ limit: 100 }),
    queryFn: () => listBusinessMembers({ limit: 100 }),
  });

  const { data: directLinks } = useQuery({
    queryKey: [...queryKeys.services.workspace(serviceId), "direct-link"],
    queryFn: () => getServiceDirectLinks(serviceId),
    enabled: tab === "online" || tab === "staff",
  });

  const invalidate = () => {
    void invalidateServiceWorkspace(queryClient, serviceId);
    onUpdated();
  };

  const detailsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchServiceDetails(serviceId, body),
    onSuccess: () => {
      toast.success("Service updated");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const staffMutation = useMutation({
    mutationFn: (staff: Record<string, unknown>[]) =>
      replaceServiceStaff(serviceId, staff),
    onSuccess: () => {
      toast.success("Staff assignments saved");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onlineMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchServiceOnlineBooking(serviceId, body),
    onSuccess: () => {
      toast.success("Online booking settings saved");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(serviceId),
    onSuccess: () => {
      toast.success("Service deleted");
      onDeleted?.();
      onUpdated();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hideStaff = Boolean(data?.service.requiresNoStaff);

  const tabs = useMemo(() => {
    return [
      { value: "details", label: "Details" },
      ...(!hideStaff ? [{ value: "staff", label: "Staff" }] : []),
      { value: "resources", label: "Resources" },
      { value: "customizations", label: "Customizations" },
      { value: "online", label: "Online Booking" },
    ];
  }, [hideStaff]);

  useEffect(() => {
    if (hideStaff && tab === "staff") setTab("details");
  }, [hideStaff, tab]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { service } = data;

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-4xl")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            <span className="text-muted-foreground">{service.categoryName}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span>{service.name}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {service.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
            {service.requiresTwoStaff ? (
              <Badge variant="outline">2 staff required</Badge>
            ) : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="Service actions" />}
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EntityDetailTabs
        value={tab}
        onValueChange={setTab}
        tabs={tabs}
        variant="panel"
        className="px-0"
        aria-label="Service sections"
      />

      {tab === "details" ? (
        <ServiceDetailsSection
          service={service}
          durationPresets={durationPresets}
          products={data.products}
          isSaving={detailsMutation.isPending}
          onSave={async (body) => {
            await detailsMutation.mutateAsync(body);
          }}
          onSaveProducts={(products) =>
            replaceServiceProducts(serviceId, products).then(() => {
              toast.success("Products updated");
              invalidate();
            })
          }
        />
      ) : null}

      {tab === "staff" && !hideStaff ? (
        <ServiceStaffSection
          staff={data.staff}
          members={membersData?.items ?? []}
          durationPresets={durationPresets}
          serviceDurationMinutes={service.durationMinutes}
          servicePrice={service.price}
          directLinks={directLinks?.staffLinks ?? []}
          requiresTwoStaff={service.requiresTwoStaff}
          isSaving={staffMutation.isPending}
          onSave={async (staff) => {
            await staffMutation.mutateAsync(staff);
          }}
        />
      ) : null}

      {tab === "resources" ? (
        <ServiceResourcesSection
          items={data.resourceRequirements}
          emphasize={service.requiresNoStaff}
          onAdd={async (body) => {
            await createResourceRequirement(serviceId, body);
            toast.success("Resource requirement added");
            invalidate();
          }}
          onUpdate={async (id, body) => {
            await updateResourceRequirement(serviceId, id, body);
            toast.success("Resource requirement updated");
            invalidate();
          }}
          onDelete={async (id) => {
            await deleteResourceRequirement(serviceId, id);
            toast.success("Removed");
            invalidate();
          }}
        />
      ) : null}

      {tab === "customizations" ? (
        <CustomizationsTab
          groups={data.optionGroups}
          onAddGroup={(body) =>
            createOptionGroup(serviceId, body).then(() => {
              toast.success("Option group created");
              invalidate();
            })
          }
          onDeleteGroup={(id) =>
            deleteOptionGroup(serviceId, id).then(() => {
              toast.success("Group deleted");
              invalidate();
            })
          }
          onAddOption={(groupId, body) =>
            createServiceOption(serviceId, groupId, body).then(() => {
              toast.success("Option added");
              invalidate();
            })
          }
          onDeleteOption={(groupId, optionId) =>
            deleteServiceOption(serviceId, groupId, optionId).then(() => {
              toast.success("Option deleted");
              invalidate();
            })
          }
        />
      ) : null}

      {tab === "online" ? (
        <ServiceOnlineBookingSection
          settings={data.onlineBooking}
          directLink={directLinks?.serviceLink}
          hint={directLinks?.hint}
          isSaving={onlineMutation.isPending}
          onSave={async (body) => {
            await onlineMutation.mutateAsync(body);
          }}
        />
      ) : null}
    </div>
  );
}

function CustomizationsTab({
  groups,
  onAddGroup,
  onDeleteGroup,
  onAddOption,
  onDeleteOption,
}: {
  groups: Array<{
    id: string;
    name: string;
    options: Array<{ id: string; name: string; priceAdjustment: string }>;
  }>;
  onAddGroup: (body: Record<string, unknown>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onAddOption: (groupId: string, body: Record<string, unknown>) => Promise<void>;
  onDeleteOption: (groupId: string, optionId: string) => Promise<void>;
}) {
  const [groupName, setGroupName] = useState("");
  const [optionNames, setOptionNames] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Create option groups for add-ons (e.g. hot stones +$10, extra time +15
          min).
        </CardContent>
      </Card>
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">{g.name}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onDeleteGroup(g.id)}
            >
              Delete group
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.options.map((o) => (
              <div key={o.id} className="flex justify-between text-sm">
                <span>
                  {o.name}{" "}
                  {Number(o.priceAdjustment) !== 0
                    ? `(+${o.priceAdjustment})`
                    : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onDeleteOption(g.id, o.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Option name"
                value={optionNames[g.id] ?? ""}
                onChange={(e) =>
                  setOptionNames({ ...optionNames, [g.id]: e.target.value })
                }
              />
              <Button
                size="sm"
                onClick={() => {
                  const n = optionNames[g.id]?.trim();
                  if (!n) return;
                  void onAddOption(g.id, { name: n });
                  setOptionNames({ ...optionNames, [g.id]: "" });
                }}
              >
                Add option
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <Button
          onClick={() => {
            if (!groupName.trim()) return;
            void onAddGroup({ name: groupName.trim() });
            setGroupName("");
          }}
        >
          Create option group
        </Button>
      </div>
    </div>
  );
}
