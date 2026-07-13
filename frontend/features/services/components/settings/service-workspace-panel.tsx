"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query/keys";
import { invalidateServiceWorkspace } from "@/lib/query/invalidation";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { listProductPicker } from "@/features/products/api/products.api";
import type { ProductPickerItem } from "@/features/products/types";
import { listResourcePicker } from "@/features/resources/api/resources.api";
import type { ResourcePickerItem } from "@/features/resources/types";
import { resourceTypeLabel } from "@/features/resources/utils/resource-schedule.util";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import type { Service } from "@/features/services/types";
import type { ServiceWorkspace } from "@/features/services/api/service-workspace.api";
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

type Props = {
  serviceId: string;
  durationPresets: number[];
  onUpdated: () => void;
};

export function ServiceWorkspacePanel({
  serviceId,
  durationPresets,
  onUpdated,
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
    enabled: tab === "online",
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

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { service } = data;
  const hideStaff = service.requiresNoStaff;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{service.categoryName}</p>
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold">{service.name}</h2>
        {service.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
        {service.requiresTwoStaff ? (
          <Badge variant="outline">2 staff required</Badge>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="details">Details</TabsTrigger>
          {!hideStaff ? <TabsTrigger value="staff">Staff</TabsTrigger> : null}
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="customizations">Customizations</TabsTrigger>
          <TabsTrigger value="online">Online booking</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DetailsTab
            service={service}
            durationPresets={durationPresets}
            isPending={detailsMutation.isPending}
            onSave={(body) => detailsMutation.mutate(body)}
            products={data.products}
            onSaveProducts={(products) =>
              replaceServiceProducts(serviceId, products).then(() => {
                toast.success("Products updated");
                invalidate();
              })
            }
          />
        </TabsContent>

        {!hideStaff ? (
          <TabsContent value="staff" className="mt-4">
            <StaffTab
              workspace={data}
              members={membersData?.items ?? []}
              directLinks={directLinks?.staffLinks ?? []}
              isPending={staffMutation.isPending}
              onSave={(staff) => staffMutation.mutate(staff)}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="resources" className="mt-4">
          <ResourcesTab
            items={data.resourceRequirements}
            emphasize={service.requiresNoStaff}
            onAdd={(body) =>
              createResourceRequirement(serviceId, body).then(() => {
                toast.success("Resource requirement added");
                invalidate();
              })
            }
            onUpdate={(id, body) =>
              updateResourceRequirement(serviceId, id, body).then(() => {
                toast.success("Resource requirement updated");
                invalidate();
              })
            }
            onDelete={(id) =>
              deleteResourceRequirement(serviceId, id).then(() => {
                toast.success("Removed");
                invalidate();
              })
            }
          />
        </TabsContent>

        <TabsContent value="customizations" className="mt-4">
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
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <OnlineBookingTab
            settings={data.onlineBooking}
            directLink={directLinks?.serviceLink}
            hint={directLinks?.hint}
            isPending={onlineMutation.isPending}
            onSave={(body) => onlineMutation.mutate(body)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({
  service,
  durationPresets,
  isPending,
  onSave,
  products,
  onSaveProducts,
}: {
  service: Service;
  durationPresets: number[];
  isPending: boolean;
  onSave: (body: Record<string, unknown>) => void;
  products: Array<Record<string, unknown>>;
  onSaveProducts: (products: Record<string, unknown>[]) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: service.name,
    description: service.description ?? "",
    price: service.price ?? "",
    durationMinutes: String(service.durationMinutes ?? 60),
    hasProcessingTime: service.hasProcessingTime,
    processingDurationMinutes: String(service.processingDurationMinutes ?? 0),
    finishDurationMinutes: service.finishDurationMinutes
      ? String(service.finishDurationMinutes)
      : "",
    hasBufferTime: service.hasBufferTime,
    bufferBeforeMinutes: String(service.bufferBeforeMinutes ?? 0),
    bufferAfterMinutes: String(service.bufferAfterMinutes ?? 0),
    usesProducts: service.usesProducts,
    requiresNoStaff: service.requiresNoStaff,
    requiresTwoStaff: service.requiresTwoStaff,
    hasCommissionDeduction: service.hasCommissionDeduction,
    commissionDeductionType: service.commissionDeductionType ?? "PERCENT",
    commissionDeductionValue: service.commissionDeductionValue ?? "",
    isDemo: service.isDemo,
  });

  useEffect(() => {
    setForm({
      name: service.name,
      description: service.description ?? "",
      price: service.price ?? "",
      durationMinutes: String(service.durationMinutes ?? 60),
      hasProcessingTime: service.hasProcessingTime,
      processingDurationMinutes: String(service.processingDurationMinutes ?? 0),
      finishDurationMinutes: service.finishDurationMinutes
        ? String(service.finishDurationMinutes)
        : "",
      hasBufferTime: service.hasBufferTime,
      bufferBeforeMinutes: String(service.bufferBeforeMinutes ?? 0),
      bufferAfterMinutes: String(service.bufferAfterMinutes ?? 0),
      usesProducts: service.usesProducts,
      requiresNoStaff: service.requiresNoStaff,
      requiresTwoStaff: service.requiresTwoStaff,
      hasCommissionDeduction: service.hasCommissionDeduction,
      commissionDeductionType: service.commissionDeductionType ?? "PERCENT",
      commissionDeductionValue: service.commissionDeductionValue ?? "",
      isDemo: service.isDemo,
    });
  }, [service]);

  const [productLabel, setProductLabel] = useState("");
  const [selectedPickerKey, setSelectedPickerKey] = useState<string | null>(
    null,
  );

  const { data: productPicker = [] } = useQuery({
    queryKey: queryKeys.products.picker(),
    queryFn: () => listProductPicker(),
    enabled: form.usesProducts,
  });

  const productPickerItems = productPicker.map((p) => ({
    value: productPickerKey(p),
    label: productPickerLabel(p),
  }));

  const selectedPickerProduct = productPicker.find(
    (p) => productPickerKey(p) === selectedPickerKey,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Price" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
          <div className="space-y-1">
            <Label>Duration</Label>
            <Select
              value={form.durationMinutes}
              onValueChange={(v) => v && setForm({ ...form, durationMinutes: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {durationPresets.map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

        <ToggleRow label="Processing time" checked={form.hasProcessingTime} onCheckedChange={(v) => setForm({ ...form, hasProcessingTime: v })} />
        {form.hasProcessingTime ? (
          <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/20 p-3">
            <Field
              label="Processing duration (min)"
              value={form.processingDurationMinutes}
              onChange={(v) => setForm({ ...form, processingDurationMinutes: v })}
              type="number"
            />
            <Field
              label="Finish duration (min, optional)"
              value={form.finishDurationMinutes}
              onChange={(v) => setForm({ ...form, finishDurationMinutes: v })}
              type="number"
            />
          </div>
        ) : null}
        <ToggleRow label="Buffer time" checked={form.hasBufferTime} onCheckedChange={(v) => setForm({ ...form, hasBufferTime: v })} />
        {form.hasBufferTime ? (
          <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/20 p-3">
            <Field
              label="Buffer before (min)"
              value={form.bufferBeforeMinutes}
              onChange={(v) => setForm({ ...form, bufferBeforeMinutes: v })}
              type="number"
            />
            <Field
              label="Buffer after (min)"
              value={form.bufferAfterMinutes}
              onChange={(v) => setForm({ ...form, bufferAfterMinutes: v })}
              type="number"
            />
          </div>
        ) : null}
        <ToggleRow label="Uses products" checked={form.usesProducts} onCheckedChange={(v) => setForm({ ...form, usesProducts: v })} />
        <ToggleRow label="Resource only (no staff)" checked={form.requiresNoStaff} onCheckedChange={(v) => setForm({ ...form, requiresNoStaff: v, requiresTwoStaff: v ? false : form.requiresTwoStaff })} />
        <ToggleRow label="Requires two staff" checked={form.requiresTwoStaff} onCheckedChange={(v) => setForm({ ...form, requiresTwoStaff: v, requiresNoStaff: v ? false : form.requiresNoStaff })} />
        <ToggleRow label="Commission deduction" checked={form.hasCommissionDeduction} onCheckedChange={(v) => setForm({ ...form, hasCommissionDeduction: v })} />
        <ToggleRow label="Demo service" checked={form.isDemo} onCheckedChange={(v) => setForm({ ...form, isDemo: v })} />

        {form.usesProducts ? (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Product usages</p>
            <ul className="mb-2 space-y-1 text-sm">
              {products.map((p) => (
                <li key={String(p.id ?? p.label)}>
                  {String(p.label)}
                  {p.linked === false ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (unlinked)
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchableSelect
                items={productPickerItems}
                value={selectedPickerKey}
                onValueChange={setSelectedPickerKey}
                placeholder="Select product…"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedPickerProduct}
                onClick={() => {
                  if (!selectedPickerProduct) return;
                  const label = productPickerLabel(selectedPickerProduct);
                  void onSaveProducts([
                    ...products.map((p) => ({
                      productId: p.productId ?? undefined,
                      variantId: p.variantId ?? undefined,
                      label: String(p.label),
                      quantity: Number(p.quantity ?? 1),
                      unitCost: p.unitCost ? Number(p.unitCost) : undefined,
                    })),
                    {
                      productId: selectedPickerProduct.productId,
                      variantId: selectedPickerProduct.variantId ?? undefined,
                      label,
                      quantity: 1,
                    },
                  ]);
                  setSelectedPickerKey(null);
                }}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Or enter label only"
                value={productLabel}
                onChange={(e) => setProductLabel(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!productLabel.trim()) return;
                  void onSaveProducts([
                    ...products.map((p) => ({
                      productId: p.productId ?? undefined,
                      variantId: p.variantId ?? undefined,
                      label: String(p.label),
                      quantity: Number(p.quantity ?? 1),
                      unitCost: p.unitCost ? Number(p.unitCost) : undefined,
                    })),
                    { label: productLabel.trim(), quantity: 1 },
                  ]);
                  setProductLabel("");
                }}
              >
                Add label
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          disabled={isPending}
          onClick={() =>
            onSave({
              ...form,
              price: form.price ? Number(form.price) : null,
              durationMinutes: Number(form.durationMinutes),
              processingDurationMinutes: Number(form.processingDurationMinutes),
              finishDurationMinutes: form.finishDurationMinutes
                ? Number(form.finishDurationMinutes)
                : null,
              bufferBeforeMinutes: Number(form.bufferBeforeMinutes),
              bufferAfterMinutes: Number(form.bufferAfterMinutes),
              commissionDeductionValue: form.hasCommissionDeduction
                ? Number(form.commissionDeductionValue)
                : null,
            })
          }
        >
          Save details
        </Button>
      </CardContent>
    </Card>
  );
}

function StaffTab({
  workspace,
  members,
  directLinks,
  isPending,
  onSave,
}: {
  workspace: ServiceWorkspace;
  members: Array<{ userId: string; user: { firstName: string | null; lastName: string | null; email: string }; status: string }>;
  directLinks: Array<{ userId: string; url: string }>;
  isPending: boolean;
  onSave: (staff: Record<string, unknown>[]) => void;
}) {
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const [assignments, setAssignments] = useState<
    Record<string, { enabled: boolean; onlineBooking: boolean; duration: string; price: string }>
  >({});

  useEffect(() => {
    const map: typeof assignments = {};
    for (const m of activeMembers) {
      const existing = workspace.staff.find((s) => s.userId === m.userId);
      map[m.userId] = {
        enabled: existing ? Boolean(existing.isEnabled) : false,
        onlineBooking: existing ? Boolean(existing.onlineBookingEnabled) : true,
        duration: existing?.durationMinutes ? String(existing.durationMinutes) : "",
        price: existing?.price ? String(existing.price) : "",
      };
    }
    setAssignments(map);
  }, [workspace.staff, members]);

  const copyLink = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-3">
      {workspace.service.requiresTwoStaff ? (
        <p className="text-sm text-amber-600">Exactly 2 enabled staff required before activating.</p>
      ) : null}
      {activeMembers.map((m) => {
        const name =
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email;
        const row = assignments[m.userId];
        const link = directLinks.find((l) => l.userId === m.userId)?.url;
        if (!row) return null;
        return (
          <Card key={m.userId}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{name}</p>
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(v) =>
                    setAssignments({ ...assignments, [m.userId]: { ...row, enabled: v } })
                  }
                />
              </div>
              {row.enabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Duration override (min)" value={row.duration} onChange={(v) => setAssignments({ ...assignments, [m.userId]: { ...row, duration: v } })} />
                  <Field label="Price override" value={row.price} onChange={(v) => setAssignments({ ...assignments, [m.userId]: { ...row, price: v } })} />
                  <ToggleRow label="Online booking" checked={row.onlineBooking} onCheckedChange={(v) => setAssignments({ ...assignments, [m.userId]: { ...row, onlineBooking: v } })} />
                  {link ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => copyLink(link)}>
                      <Copy className="mr-1 size-3" /> Direct link
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      <Button
        disabled={isPending}
        onClick={() =>
          onSave(
            Object.entries(assignments)
              .filter(([, a]) => a.enabled)
              .map(([userId, a]) => ({
                userId,
                isEnabled: true,
                onlineBookingEnabled: a.onlineBooking,
                durationMinutes: a.duration ? Number(a.duration) : null,
                price: a.price ? Number(a.price) : null,
              })),
          )
        }
      >
        Save staff
      </Button>
    </div>
  );
}

function ResourcesTab({
  items,
  emphasize,
  onAdd,
  onUpdate,
  onDelete,
}: {
  items: ServiceWorkspace["resourceRequirements"];
  emphasize: boolean;
  onAdd: (body: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, body: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [resourceType, setResourceType] = useState("ROOM");
  const [selectedPickerKey, setSelectedPickerKey] = useState<string | null>(
    null,
  );

  const { data: resourcePicker = [] } = useQuery({
    queryKey: queryKeys.resources.picker(),
    queryFn: () => listResourcePicker(),
  });

  const pickerItems = resourcePicker.map((r) => ({
    value: r.id,
    label: resourcePickerLabel(r),
  }));

  const selectedResource = resourcePicker.find((r) => r.id === selectedPickerKey);

  return (
    <div className="space-y-4">
      {emphasize ? (
        <p className="text-sm text-amber-600">Required for resource-only services.</p>
      ) : null}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Link rooms, equipment, or consumables required to perform this service.
          Manage the catalog under{" "}
          <a
            href="/business/settings/resources"
            className="text-primary underline-offset-4 hover:underline"
          >
            Settings → Resources
          </a>
          .
        </CardContent>
      </Card>
      <ul className="space-y-3">
        {items.map((item) => (
          <ResourceRequirementRow
            key={item.id}
            item={item}
            resourcePicker={resourcePicker}
            onUpdate={(body) => onUpdate(item.id, body)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </ul>
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Add requirement</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Label (e.g. Treatment room)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Select
            value={resourceType}
            onValueChange={(v) => setResourceType(v ?? "")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ROOM">Room</SelectItem>
              <SelectItem value="EQUIPMENT">Equipment</SelectItem>
              <SelectItem value="CONSUMABLE">Consumable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SearchableSelect
          items={pickerItems}
          value={selectedPickerKey}
          onValueChange={setSelectedPickerKey}
          placeholder="Link resource (optional)…"
        />
        <Button
          onClick={() => {
            if (!label.trim()) return;
            void onAdd({
              label: label.trim(),
              resourceType,
              resourceId: selectedResource?.id ?? null,
            });
            setLabel("");
            setSelectedPickerKey(null);
          }}
        >
          Add requirement
        </Button>
      </div>
    </div>
  );
}

function ResourceRequirementRow({
  item,
  resourcePicker,
  onUpdate,
  onDelete,
}: {
  item: ServiceWorkspace["resourceRequirements"][number];
  resourcePicker: ResourcePickerItem[];
  onUpdate: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [resourceId, setResourceId] = useState(item.resourceId ?? "");

  useEffect(() => {
    setQuantity(String(item.quantity));
    setResourceId(item.resourceId ?? "");
  }, [item]);

  const filteredPicker = resourcePicker.filter(
    (r) => r.resourceType === item.resourceType,
  );

  return (
    <li className="space-y-2 rounded border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">
            {resourceTypeLabel(item.resourceType)}
            {item.resourceName ? ` · ${item.resourceName}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void onDelete()}>
          Remove
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Linked resource</Label>
          <Select
            value={resourceId || "__none__"}
            onValueChange={(v) => setResourceId(!v || v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Not linked" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {filteredPicker.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {resourcePickerLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() =>
              void onUpdate({
                resourceId: resourceId || null,
                quantity: Math.max(1, Number(quantity) || 1),
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
      {!item.linked ? (
        <Badge variant="outline">Not linked to catalog</Badge>
      ) : null}
    </li>
  );
}

function resourcePickerLabel(item: ResourcePickerItem): string {
  const group = item.groupName ? ` (${item.groupName})` : "";
  return `${item.name}${group} · ${resourceTypeLabel(item.resourceType)}`;
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
          Create option groups for add-ons (e.g. hot stones +$10, extra time +15 min).
        </CardContent>
      </Card>
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">{g.name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void onDeleteGroup(g.id)}>
              Delete group
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.options.map((o) => (
              <div key={o.id} className="flex justify-between text-sm">
                <span>
                  {o.name}{" "}
                  {Number(o.priceAdjustment) !== 0 ? `(+${o.priceAdjustment})` : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void onDeleteOption(g.id, o.id)}>
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
        <Input placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
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

function OnlineBookingTab({
  settings,
  directLink,
  hint,
  isPending,
  onSave,
}: {
  settings: Record<string, unknown> | null;
  directLink: string | null | undefined;
  hint: string | null | undefined;
  isPending: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    onlineBookingEnabled: Boolean(settings?.onlineBookingEnabled ?? true),
    customizePriceDisplay: Boolean(settings?.customizePriceDisplay),
    showPromptToCall: Boolean(settings?.showPromptToCall),
    requireHomeAddress: Boolean(settings?.requireHomeAddress),
    requireCreditCard: Boolean(settings?.requireCreditCard),
    requirePaymentAtBooking: String(settings?.requirePaymentAtBooking ?? "NO"),
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      onlineBookingEnabled: Boolean(settings.onlineBookingEnabled ?? true),
      customizePriceDisplay: Boolean(settings.customizePriceDisplay),
      showPromptToCall: Boolean(settings.showPromptToCall),
      requireHomeAddress: Boolean(settings.requireHomeAddress),
      requireCreditCard: Boolean(settings.requireCreditCard),
      requirePaymentAtBooking: String(settings.requirePaymentAtBooking ?? "NO"),
    });
  }, [settings]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <ToggleRow
          label="Available in online booking"
          checked={form.onlineBookingEnabled}
          onCheckedChange={(v) => setForm({ ...form, onlineBookingEnabled: v })}
        />
        {directLink ? (
          <div className="flex items-center gap-2 rounded border p-2 text-sm">
            <span className="truncate flex-1">{directLink}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(directLink);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3" />
            </Button>
          </div>
        ) : hint ? (
          <p className="text-sm text-muted-foreground">{hint}</p>
        ) : null}
        <ToggleRow label="Customize price display" checked={form.customizePriceDisplay} onCheckedChange={(v) => setForm({ ...form, customizePriceDisplay: v })} />
        <ToggleRow label="Show prompt to call" checked={form.showPromptToCall} onCheckedChange={(v) => setForm({ ...form, showPromptToCall: v })} />
        <ToggleRow label="Require home address" checked={form.requireHomeAddress} onCheckedChange={(v) => setForm({ ...form, requireHomeAddress: v })} />
        <ToggleRow label="Require credit card" checked={form.requireCreditCard} onCheckedChange={(v) => setForm({ ...form, requireCreditCard: v })} />
        <Button
          disabled={isPending}
          onClick={() => onSave(form)}
        >
          Save online booking
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function productPickerKey(item: ProductPickerItem) {
  return item.variantId
    ? `${item.productId}:${item.variantId}`
    : item.productId;
}

function productPickerLabel(item: ProductPickerItem) {
  return item.variantLabel
    ? `${item.name} — ${item.variantLabel}`
    : item.name;
}
