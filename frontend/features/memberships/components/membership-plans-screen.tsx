"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Lock,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsCard } from "@/components/layout/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateMemberships } from "@/lib/query/invalidation";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import { getServicesTree } from "@/features/services/api/service-workspace.api";
import {
  archiveMembershipPlan,
  createMembershipPlan,
  duplicateMembershipPlan,
  getMembershipSettings,
  listMembershipPlans,
  updateMembershipAdvanced,
  updateMembershipAgreement,
  updateMembershipPlanDetails,
  updateMembershipDiscounts,
  updateMembershipPlanOnlineSales,
  updateMembershipServiceGroups,
} from "@/features/memberships/api/memberships.api";
import {
  formatMembershipPrice,
  resolvePublicMembershipDirectUrl,
} from "@/features/memberships/utils/membership-url";
import type {
  MembershipCommissionBasis,
  MembershipPlan,
  MembershipPlanType,
  ServiceGroupItemInput,
} from "@/features/memberships/types";

const TABS = [
  { id: "details", label: "Details" },
  { id: "services", label: "Services" },
  { id: "discounts", label: "Discounts" },
  { id: "agreement", label: "Agreement" },
  { id: "online-sales", label: "Online Sales" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function planTitle(p: MembershipPlan) {
  return `${p.emoji ?? ""} ${p.name}`.trim();
}

function isServiceGroupFormValid(input: {
  serviceIds: string[];
  quantity: string;
}) {
  const quantity = Number(input.quantity);
  if (input.serviceIds.length === 0) return false;
  return !Number.isNaN(quantity) && quantity >= 1;
}

export function MembershipPlansScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("details");
  const [createOpen, setCreateOpen] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [pickerServiceId, setPickerServiceId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPlanType, setNewPlanType] =
    useState<MembershipPlanType>("SERVICES");

  const [groupServiceIds, setGroupServiceIds] = useState<string[]>([]);
  const [groupQuantity, setGroupQuantity] = useState("1");

  const plansQuery = useQuery({
    queryKey: queryKeys.memberships.plans(true),
    queryFn: () => listMembershipPlans(true),
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.memberships.settings(),
    queryFn: getMembershipSettings,
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    enabled: addingGroup,
  });

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => p.name.toLowerCase().includes(q));
  }, [plans, search]);

  const activeSelectedId = selectedId ?? filtered[0]?.id ?? null;
  const selected = useMemo(
    () => plans.find((p) => p.id === activeSelectedId) ?? null,
    [plans, activeSelectedId],
  );

  const [editForm, setEditForm] = useState<MembershipPlan | null>(null);
  const [editSourceKey, setEditSourceKey] = useState<string | null>(null);
  const currentEditSourceKey = selected
    ? `${selected.id}:${selected.updatedAt}`
    : null;
  if (currentEditSourceKey !== editSourceKey) {
    setEditSourceKey(currentEditSourceKey);
    setEditForm(selected ? { ...selected } : null);
  }

  const invalidate = async () => invalidateMemberships(queryClient);

  const saveDetails = useMutation({
    mutationFn: (body: MembershipPlan) =>
      updateMembershipPlanDetails(body.id, {
        name: body.name,
        emoji: body.emoji ?? undefined,
        billingIntervalCount: body.billingIntervalCount,
        billingIntervalUnit: body.billingIntervalUnit,
        price: Number(body.price),
        chargeServiceTax: body.chargeServiceTax,
        servicesExpireAfterDays: body.servicesExpireAfter,
        creditAmount:
          body.creditAmount != null ? Number(body.creditAmount) : null,
      }),
    onSuccess: async () => {
      toast.success("Plan saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDiscounts = useMutation({
    mutationFn: (body: MembershipPlan) =>
      updateMembershipDiscounts(body.id, {
        productDiscountPercent: Number(body.productDiscountPercent),
        serviceDiscountPercent: Number(body.serviceDiscountPercent),
      }),
    onSuccess: async () => {
      toast.success("Discounts saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAgreement = useMutation({
    mutationFn: (body: MembershipPlan) =>
      updateMembershipAgreement(body.id, {
        requireAgreement: body.requireAgreement,
        agreementText: body.agreementText ?? undefined,
      }),
    onSuccess: async () => {
      toast.success("Agreement saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOnlineSales = useMutation({
    mutationFn: (body: MembershipPlan) =>
      updateMembershipPlanOnlineSales(body.id, {
        availableOnline: body.availableOnline,
        shortDescription: body.shortDescription ?? undefined,
        description: body.description ?? undefined,
      }),
    onSuccess: async () => {
      toast.success("Online sales saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAdvanced = useMutation({
    mutationFn: (body: MembershipPlan) =>
      updateMembershipAdvanced(body.id, {
        commissionBasis: body.commissionBasis,
      }),
    onSuccess: async () => {
      toast.success("Advanced settings saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createPlan = useMutation({
    mutationFn: () =>
      createMembershipPlan({
        name: newName.trim(),
        planType: newPlanType,
      }),
    onSuccess: async (plan) => {
      toast.success("Plan created");
      setCreateOpen(false);
      setSelectedId(plan.id);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archivePlan = useMutation({
    mutationFn: archiveMembershipPlan,
    onSuccess: async () => {
      toast.success("Plan archived");
      setSelectedId(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicatePlan = useMutation({
    mutationFn: duplicateMembershipPlan,
    onSuccess: async (plan) => {
      toast.success("Plan duplicated");
      setSelectedId(plan.id);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveServiceGroups = useMutation({
    mutationFn: ({
      planId,
      groups,
    }: {
      planId: string;
      groups: ServiceGroupItemInput[];
    }) => updateMembershipServiceGroups(planId, groups),
    onSuccess: async () => {
      toast.success("Service groups saved");
      setAddingGroup(false);
      setShowServicePicker(false);
      setPickerServiceId(null);
      setGroupServiceIds([]);
      setGroupQuantity("1");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceOptions = useMemo(() => {
    const categories = servicesQuery.data?.categories ?? [];
    return categories.flatMap((category) =>
      category.services
        .filter((service) => service.status === "ACTIVE" && !service.isDemo)
        .map((service) => ({
          id: service.id,
          name: service.name,
          categoryName: category.name,
        })),
    );
  }, [servicesQuery.data?.categories]);

  const selectedGroupServices = useMemo(
    () =>
      groupServiceIds
        .map((id) => serviceOptions.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s),
    [groupServiceIds, serviceOptions],
  );

  const availableServiceItems = useMemo(
    () =>
      serviceOptions
        .filter((s) => !groupServiceIds.includes(s.id))
        .map((s) => ({
          value: s.id,
          label: s.categoryName ? `${s.name} (${s.categoryName})` : s.name,
        })),
    [groupServiceIds, serviceOptions],
  );

  const canSaveGroup = isServiceGroupFormValid({
    serviceIds: groupServiceIds,
    quantity: groupQuantity,
  });

  function startAddingGroup() {
    setGroupServiceIds([]);
    setGroupQuantity("1");
    setShowServicePicker(false);
    setPickerServiceId(null);
    setAddingGroup(true);
  }

  function cancelAddingGroup() {
    setAddingGroup(false);
    setShowServicePicker(false);
    setPickerServiceId(null);
    setGroupServiceIds([]);
    setGroupQuantity("1");
  }

  function addPickedService(serviceId: string | null) {
    if (!serviceId || groupServiceIds.includes(serviceId)) return;
    setGroupServiceIds((prev) => [...prev, serviceId]);
    setPickerServiceId(null);
    setShowServicePicker(false);
  }

  function removeServiceGroup(groupId: string) {
    if (!selected) return;
    const groups: ServiceGroupItemInput[] = selected.serviceGroups
      .filter((g) => g.id !== groupId)
      .map((g) => ({
        id: g.id,
        quantity: g.quantity,
        groupPrice: g.groupPrice != null ? Number(g.groupPrice) : undefined,
        serviceIds: g.items.map((i) => i.serviceId),
      }));
    saveServiceGroups.mutate({ planId: selected.id, groups });
  }

  function saveNewGroup() {
    if (!selected) return;
    const existing: ServiceGroupItemInput[] = selected.serviceGroups.map(
      (g) => ({
        id: g.id,
        quantity: g.quantity,
        groupPrice: g.groupPrice != null ? Number(g.groupPrice) : undefined,
        serviceIds: g.items.map((i) => i.serviceId),
      }),
    );
    existing.push({
      quantity: Number(groupQuantity),
      serviceIds: groupServiceIds,
    });
    saveServiceGroups.mutate({ planId: selected.id, groups: existing });
  }

  const membershipSettings = settingsQuery.data;
  const planDirectLink = useMemo(() => {
    if (!selected?.id || !editForm?.availableOnline) return null;
    if (selected.directLink) return selected.directLink;
    const slug = membershipSettings?.publicSlug;
    if (!slug) return null;
    return resolvePublicMembershipDirectUrl(slug, selected.id);
  }, [selected, editForm?.availableOnline, membershipSettings?.publicSlug]);

  const onlineSalesDirty =
    !!editForm &&
    !!selected &&
    editForm.availableOnline !== selected.availableOnline;

  return (
    <PageContainer>
      <PageHeader
        title="Membership Plans"
        description="Configure membership plans, services, discounts, and online sales."
        actions={
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/business/memberships" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Memberships
          </Button>
        }
      />

      <div className="grid min-h-[600px] gap-4 lg:grid-cols-[240px_180px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Plan
            </Button>
            <Button variant="outline" size="icon" aria-label="Search">
              <Search className="size-4" />
            </Button>
          </div>
          <Input
            placeholder="Search plans"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="space-y-1">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    activeSelectedId === p.id && "bg-muted font-medium",
                    p.isArchived && "opacity-60",
                  )}
                  onClick={() => setSelectedId(p.id)}
                >
                  {planTitle(p)}
                  {p.isArchived ? " (archived)" : ""}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <nav className="space-y-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm",
                tab === item.id
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {!selected || !editForm ? (
            <div className="text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-sm">
              Select or create a membership plan.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {planTitle(selected)}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {formatMembershipPrice(
                      selected.price,
                      selected.billingIntervalCount,
                      selected.billingIntervalUnit,
                    )}
                    {selected.activeMembershipCount > 0
                      ? ` · ${selected.activeMembershipCount} active`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicatePlan.mutate(selected.id)}
                  >
                    Duplicate
                  </Button>
                  {!selected.isArchived ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => archivePlan.mutate(selected.id)}
                    >
                      Archive
                    </Button>
                  ) : null}
                </div>
              </div>

              {tab === "details" ? (
                <SettingsCard title="Details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Emoji</Label>
                      <Input
                        value={editForm.emoji ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, emoji: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plan type</Label>
                      <p className="text-muted-foreground text-sm capitalize">
                        {editForm.planType.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        selectOnFocus
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billing interval count</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editForm.billingIntervalCount}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            billingIntervalCount: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billing interval unit</Label>
                      <RadioGroup
                        value={editForm.billingIntervalUnit}
                        onValueChange={(v) =>
                          setEditForm({
                            ...editForm,
                            billingIntervalUnit:
                              v as MembershipPlan["billingIntervalUnit"],
                          })
                        }
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="WEEK" id="unit-week" />
                          <Label htmlFor="unit-week">Week</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="MONTH" id="unit-month" />
                          <Label htmlFor="unit-month">Month</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="YEAR" id="unit-year" />
                          <Label htmlFor="unit-year">Year</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Charge service tax</Label>
                      <Switch
                        checked={editForm.chargeServiceTax}
                        onCheckedChange={(v) =>
                          setEditForm({ ...editForm, chargeServiceTax: v })
                        }
                      />
                    </div>
                    {editForm.planType === "SERVICES" ? (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Services expire after (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Leave empty for no expiration"
                          value={editForm.servicesExpireAfter ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              servicesExpireAfter: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Account credit amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          selectOnFocus
                          value={editForm.creditAmount ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              creditAmount: e.target.value || null,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => saveDetails.mutate(editForm)}>
                      Save
                    </Button>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "services" && editForm.planType === "SERVICES" ? (
                <SettingsCard title="Services">
                  <div className="space-y-3">
                    {selected.serviceGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {group.quantity} of the following services
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {group.items.map((item) => (
                              <Badge key={item.serviceId} variant="secondary">
                                {item.service.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeServiceGroup(group.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}

                    {addingGroup ? (
                      <div className="space-y-4 rounded-lg border p-4">
                        <div>
                          <h3 className="font-medium">New Service Group</h3>
                          <p className="text-muted-foreground text-sm">
                            Select the services included in this group.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Services</Label>
                          {selectedGroupServices.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedGroupServices.map((service) => (
                                <Badge
                                  key={service.id}
                                  variant="secondary"
                                  className="gap-1 pr-1"
                                >
                                  {service.name}
                                  <button
                                    type="button"
                                    className="hover:bg-muted rounded-sm p-0.5"
                                    aria-label={`Remove ${service.name}`}
                                    onClick={() =>
                                      setGroupServiceIds((prev) =>
                                        prev.filter((id) => id !== service.id),
                                      )
                                    }
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {showServicePicker ? (
                            <div className="space-y-2">
                              <SearchableSelect
                                items={availableServiceItems}
                                value={pickerServiceId}
                                onValueChange={addPickedService}
                                placeholder="Select service…"
                                emptyMessage={
                                  servicesQuery.isLoading
                                    ? "Loading services…"
                                    : "No services available."
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="px-0"
                                onClick={() => {
                                  setShowServicePicker(false);
                                  setPickerServiceId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto px-0"
                              disabled={
                                servicesQuery.isLoading ||
                                availableServiceItems.length === 0
                              }
                              onClick={() => setShowServicePicker(true)}
                            >
                              + Add service
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity per period</Label>
                          <Input
                            type="number"
                            min={1}
                            value={groupQuantity}
                            onChange={(e) => setGroupQuantity(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelAddingGroup}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            disabled={!canSaveGroup || saveServiceGroups.isPending}
                            onClick={saveNewGroup}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="link"
                        className="px-0"
                        onClick={startAddingGroup}
                      >
                        + Add service group
                      </Button>
                    )}
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "services" && editForm.planType === "ACCOUNT_CREDIT" ? (
                <SettingsCard title="Services">
                  <p className="text-muted-foreground text-sm">
                    Account credit plans do not include service groups. Credit
                    is applied to the client wallet each billing period.
                  </p>
                </SettingsCard>
              ) : null}

              {tab === "discounts" ? (
                <SettingsCard title="Discounts">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Product discount (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={editForm.productDiscountPercent}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            productDiscountPercent: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Service discount (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={editForm.serviceDiscountPercent}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            serviceDiscountPercent: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => saveDiscounts.mutate(editForm)}>
                      Save
                    </Button>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "agreement" ? (
                <SettingsCard title="Membership agreement">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Require membership agreement</Label>
                      <Switch
                        checked={editForm.requireAgreement}
                        onCheckedChange={(v) =>
                          setEditForm({ ...editForm, requireAgreement: v })
                        }
                      />
                    </div>
                    {editForm.requireAgreement ? (
                      <Textarea
                        rows={5}
                        value={editForm.agreementText ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            agreementText: e.target.value,
                          })
                        }
                      />
                    ) : null}
                    <div className="flex justify-end">
                      <Button onClick={() => saveAgreement.mutate(editForm)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "online-sales" ? (
                <SettingsCard title="Online Sales">
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      When enabled, clients can subscribe to this plan through
                      a direct link.
                    </p>
                    <div className="flex items-center justify-between">
                      <Label>Available to purchase online</Label>
                      <Switch
                        checked={editForm.availableOnline}
                        onCheckedChange={(v) =>
                          setEditForm({ ...editForm, availableOnline: v })
                        }
                      />
                    </div>

                    {editForm.availableOnline &&
                    membershipSettings &&
                    !membershipSettings.stripeReady ? (
                      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40">
                        <div className="flex gap-2 font-medium">
                          <Lock className="mt-0.5 size-4 shrink-0" />
                          Payment processing required
                        </div>
                        <p className="text-muted-foreground mt-1">
                          Connect Stripe before clients can complete checkout.{" "}
                          <Link
                            href="/business/settings/integrations"
                            className="text-primary underline"
                          >
                            Set up payment processing
                          </Link>
                        </p>
                      </div>
                    ) : null}

                    {editForm.availableOnline ? (
                      <div className="space-y-2">
                        <Label>Direct link</Label>
                        {planDirectLink ? (
                          <div className="flex gap-2">
                            <Input readOnly value={planDirectLink} />
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Open plan purchase page"
                              nativeButton={false}
                              render={
                                <a
                                  href={planDirectLink}
                                  target="_blank"
                                  rel="noreferrer"
                                />
                              }
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Copy direct link"
                              onClick={() =>
                                void copyTextToClipboard(
                                  planDirectLink,
                                  "Direct link",
                                )
                              }
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {onlineSalesDirty
                              ? "Save this plan to generate your direct link."
                              : "Save with online sales enabled to generate your direct link."}
                          </p>
                        )}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label>Short description</Label>
                      <Input
                        value={editForm.shortDescription ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            shortDescription: e.target.value,
                          })
                        }
                        placeholder="Shown on the public membership page"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={6}
                        value={editForm.description ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional details shown to clients before checkout"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => saveOnlineSales.mutate(editForm)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "advanced" ? (
                <SettingsCard title="How is service commission calculated?">
                  <RadioGroup
                    value={editForm.commissionBasis}
                    onValueChange={(v) => {
                      const next = {
                        ...editForm,
                        commissionBasis: v as MembershipCommissionBasis,
                      };
                      setEditForm(next);
                      saveAdvanced.mutate(next);
                    }}
                  >
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value="REGULAR_PRICE"
                          id="comm-regular"
                        />
                        <Label htmlFor="comm-regular">
                          Based on regular price
                        </Label>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Commission will be calculated based on the regular
                        service price.
                      </p>
                    </div>
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value="DISCOUNTED_PRICE"
                          id="comm-discounted"
                        />
                        <Label htmlFor="comm-discounted">
                          Based on discounted price
                        </Label>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Commission will be calculated based on the discounted
                        service price.
                      </p>
                    </div>
                  </RadioGroup>
                </SettingsCard>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Membership Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan type</Label>
              <RadioGroup
                value={newPlanType}
                onValueChange={(v) =>
                  setNewPlanType(v as MembershipPlanType)
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="SERVICES" id="type-services" />
                  <Label htmlFor="type-services">Services</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ACCOUNT_CREDIT" id="type-credit" />
                  <Label htmlFor="type-credit">Account credit</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim()}
              onClick={() => createPlan.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
