"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Lock, Plus, Search, Trash2, X } from "lucide-react";
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
import { invalidatePackages } from "@/lib/query/invalidation";
import { copyTextToClipboard } from "@/features/forms/utils/copy-text.util";
import { getServicesTree } from "@/features/services/api/service-workspace.api";
import {
  addPackageServiceGroup,
  createPackageTemplate,
  deletePackageServiceGroup,
  deletePackageTemplate,
  getPackageSettings,
  listPackageTemplates,
  updatePackageTemplate,
} from "@/features/packages/api/packages.api";
import { resolvePublicPackageDirectUrl } from "@/features/packages/utils/package-url";
import type {
  PackageCommissionBasis,
  PackageExpirationPolicy,
  PackageServiceGroupQuantityType,
  PackageTemplate,
} from "@/features/packages/types";

const TABS = [
  { id: "details", label: "Details" },
  { id: "services", label: "Services" },
  { id: "online-sales", label: "Online Sales" },
  { id: "agreement", label: "Agreement" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function templateTitle(t: PackageTemplate) {
  return `${t.emoji ?? ""} ${t.name}`.trim();
}

function isServiceGroupFormValid(input: {
  serviceIds: string[];
  quantityType: PackageServiceGroupQuantityType;
  quantity: string;
  price: string;
}) {
  const price = Number(input.price);
  const quantity = Number(input.quantity);
  if (input.serviceIds.length === 0) return false;
  if (input.price.trim() === "" || Number.isNaN(price) || price < 0) return false;
  if (input.quantityType === "ONE") return true;
  return !Number.isNaN(quantity) && quantity >= 1;
}

export function PackageSetupScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("details");
  const [createOpen, setCreateOpen] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [pickerServiceId, setPickerServiceId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");
  const [newPrice, setNewPrice] = useState("");

  const [groupServiceIds, setGroupServiceIds] = useState<string[]>([]);
  const [groupQuantity, setGroupQuantity] = useState("1");
  const [groupQuantityType, setGroupQuantityType] =
    useState<PackageServiceGroupQuantityType>("ONE");
  const [groupPrice, setGroupPrice] = useState("");

  const templatesQuery = useQuery({
    queryKey: queryKeys.packages.templates(),
    queryFn: listPackageTemplates,
  });

  const packageSettingsQuery = useQuery({
    queryKey: queryKeys.packages.settings(),
    queryFn: getPackageSettings,
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    enabled: addingGroup,
  });

  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, search]);

  const activeSelectedId = selectedId ?? filtered[0]?.id ?? null;
  const selected = useMemo(
    () => templates.find((t) => t.id === activeSelectedId) ?? null,
    [templates, activeSelectedId],
  );

  const [editForm, setEditForm] = useState<PackageTemplate | null>(null);
  const [editSourceKey, setEditSourceKey] = useState<string | null>(null);
  const currentEditSourceKey = selected
    ? `${selected.id}:${selected.updatedAt}`
    : null;
  if (currentEditSourceKey !== editSourceKey) {
    setEditSourceKey(currentEditSourceKey);
    setEditForm(selected ? { ...selected } : null);
  }

  const saveTemplate = useMutation({
    mutationFn: (body: PackageTemplate) =>
      updatePackageTemplate(body.id, {
        name: body.name,
        emoji: body.emoji ?? undefined,
        totalPrice: Number(body.totalPrice),
        chargeTax: body.chargeTax,
        expirationPolicy: body.expirationPolicy,
        expirationDays: body.expirationDays ?? undefined,
        onlineSalesEnabled: body.onlineSalesEnabled,
        shortDescription: body.shortDescription ?? undefined,
        description: body.description ?? undefined,
        requireAgreement: body.requireAgreement,
        agreementText: body.agreementText ?? undefined,
        commissionBasis: body.commissionBasis,
      }),
    onSuccess: async (updated) => {
      toast.success("Package saved");
      queryClient.setQueryData<PackageTemplate[]>(
        queryKeys.packages.templates(),
        (current) =>
          current?.map((template) =>
            template.id === updated.id ? { ...template, ...updated } : template,
          ),
      );
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTemplate = useMutation({
    mutationFn: () =>
      createPackageTemplate({
        name: newName.trim(),
        emoji: newEmoji.trim() || undefined,
        totalPrice: Number(newPrice),
      }),
    onSuccess: async (t) => {
      toast.success("Package created");
      setCreateOpen(false);
      setSelectedId(t.id);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTemplate = useMutation({
    mutationFn: deletePackageTemplate,
    onSuccess: async () => {
      toast.success("Package deleted");
      setSelectedId(null);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addGroup = useMutation({
    mutationFn: () =>
      addPackageServiceGroup(selected!.id, {
        serviceIds: groupServiceIds,
        quantity:
          groupQuantityType === "ONE" ? 1 : Number(groupQuantity),
        quantityType: groupQuantityType,
        groupPrice: Number(groupPrice),
      }),
    onSuccess: async () => {
      toast.success("Service group added");
      setAddingGroup(false);
      setShowServicePicker(false);
      setPickerServiceId(null);
      setGroupServiceIds([]);
      setGroupQuantity("1");
      setGroupQuantityType("ONE");
      setGroupPrice("");
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeGroup = useMutation({
    mutationFn: ({ templateId, groupId }: { templateId: string; groupId: string }) =>
      deletePackageServiceGroup(templateId, groupId),
    onSuccess: async () => {
      toast.success("Service group removed");
      await invalidatePackages(queryClient);
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
    quantityType: groupQuantityType,
    quantity: groupQuantity,
    price: groupPrice,
  });

  function startAddingGroup() {
    setGroupServiceIds([]);
    setGroupQuantity("1");
    setGroupQuantityType("ONE");
    setGroupPrice("");
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
    setGroupQuantityType("ONE");
    setGroupPrice("");
  }

  function addPickedService(serviceId: string | null) {
    if (!serviceId || groupServiceIds.includes(serviceId)) return;
    setGroupServiceIds((prev) => [...prev, serviceId]);
    setPickerServiceId(null);
    setShowServicePicker(false);
  }

  const packageSettings = packageSettingsQuery.data;
  const packageDirectLink = useMemo(() => {
    if (!selected?.id || !editForm?.onlineSalesEnabled) return null;
    if (selected.directLink) return selected.directLink;
    const slug = packageSettings?.publicSlug;
    if (!slug) return null;
    return resolvePublicPackageDirectUrl(slug, selected.id);
  }, [
    editForm?.onlineSalesEnabled,
    packageSettings?.publicSlug,
    selected?.directLink,
    selected?.id,
  ]);

  const onlineSalesDirty =
    !!editForm &&
    !!selected &&
    editForm.onlineSalesEnabled !== selected.onlineSalesEnabled;

  return (
    <PageContainer>
      <PageHeader
        title="Package Setup"
        description="Configure package templates, services, and online sales."
        actions={
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/business/packages" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Packages
          </Button>
        }
      />

      <div className="grid min-h-[600px] gap-4 lg:grid-cols-[240px_180px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Package
            </Button>
            <Button variant="outline" size="icon" aria-label="Search">
              <Search className="size-4" />
            </Button>
          </div>
          <Input
            placeholder="Search packages"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="space-y-1">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    activeSelectedId === t.id && "bg-muted font-medium",
                  )}
                  onClick={() => setSelectedId(t.id)}
                >
                  {templateTitle(t)}
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
              Select or create a package template.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {templateTitle(selected)}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Price: ${selected.totalPrice}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeTemplate.mutate(selected.id)}
                >
                  Delete
                </Button>
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
                      <Label>Total price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        selectOnFocus
                        value={editForm.totalPrice}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            totalPrice: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Charge service tax</Label>
                      <Switch
                        checked={editForm.chargeTax}
                        onCheckedChange={(v) =>
                          setEditForm({ ...editForm, chargeTax: v })
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Expiration policy</Label>
                      <RadioGroup
                        value={editForm.expirationPolicy}
                        onValueChange={(v) =>
                          setEditForm({
                            ...editForm,
                            expirationPolicy: v as PackageExpirationPolicy,
                            ...(v === "NEVER" ? { expirationDays: null } : {}),
                          })
                        }
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="NEVER" id="exp-never" />
                          <Label htmlFor="exp-never">Never</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            value="AFTER_PURCHASE"
                            id="exp-after"
                          />
                          <Label htmlFor="exp-after">After purchase</Label>
                        </div>
                      </RadioGroup>
                      {editForm.expirationPolicy === "AFTER_PURCHASE" ? (
                        <div className="mt-2 max-w-[160px] space-y-1.5">
                          <Label htmlFor="exp-days">
                            Days <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="exp-days"
                            type="number"
                            min={1}
                            step={1}
                            selectOnFocus
                            placeholder="Days"
                            aria-required
                            aria-invalid={
                              editForm.expirationDays == null ||
                              editForm.expirationDays < 1
                            }
                            value={editForm.expirationDays ?? ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                expirationDays: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        if (editForm.expirationPolicy === "AFTER_PURCHASE") {
                          const days = editForm.expirationDays;
                          if (
                            days == null ||
                            !Number.isFinite(days) ||
                            days < 1 ||
                            !Number.isInteger(days)
                          ) {
                            toast.error(
                              "Enter how many days until the package expires after purchase.",
                            );
                            return;
                          }
                        }
                        saveTemplate.mutate(editForm);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "services" ? (
                <SettingsCard title="Services">
                  <div className="space-y-3">
                    {selected.serviceGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {group.quantityType === "ONE"
                              ? `One of the following services for $${group.groupPrice}`
                              : `${group.quantity} of the following services for $${group.groupPrice}`}
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
                          onClick={() =>
                            removeGroup.mutate({
                              templateId: selected.id,
                              groupId: group.id,
                            })
                          }
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
                            Select the services clients can choose from.
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
                                    : "No services available. Add services in Settings first."
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
                            <div className="space-y-1">
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto px-0"
                                disabled={
                                  servicesQuery.isLoading ||
                                  (!servicesQuery.isLoading &&
                                    availableServiceItems.length === 0)
                                }
                                onClick={() => setShowServicePicker(true)}
                              >
                                {servicesQuery.isLoading
                                  ? "Loading services…"
                                  : "+ Add service"}
                              </Button>
                              {!servicesQuery.isLoading &&
                              availableServiceItems.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                  No active services found. Add services in{" "}
                                  <Link
                                    href="/business/settings/services"
                                    className="text-primary underline-offset-4 hover:underline"
                                  >
                                    Settings → Services
                                  </Link>
                                  .
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>How many services are included?</Label>
                          <RadioGroup
                            value={groupQuantityType}
                            onValueChange={(v) => {
                              const next = v as PackageServiceGroupQuantityType;
                              setGroupQuantityType(next);
                              if (next === "ONE") setGroupQuantity("1");
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="ONE" id="qty-one" />
                              <Label htmlFor="qty-one">One service</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem
                                value="MULTIPLE"
                                id="qty-multiple"
                              />
                              <Label htmlFor="qty-multiple">
                                Multiple services
                              </Label>
                            </div>
                          </RadioGroup>
                          {groupQuantityType === "MULTIPLE" ? (
                            <Input
                              type="number"
                              min={1}
                              value={groupQuantity}
                              onChange={(e) => setGroupQuantity(e.target.value)}
                            />
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label>Total price for all services</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            selectOnFocus
                            value={groupPrice}
                            onChange={(e) => setGroupPrice(e.target.value)}
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
                            disabled={!canSaveGroup || addGroup.isPending}
                            onClick={() => addGroup.mutate()}
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

              {tab === "online-sales" ? (
                <SettingsCard title="Online Sales">
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      When enabled for online sales, this package can be
                      purchased by clients through a direct link.
                    </p>
                    <div className="flex items-center justify-between">
                      <Label>Available to purchase online</Label>
                      <Switch
                        checked={editForm.onlineSalesEnabled}
                        onCheckedChange={(v) =>
                          setEditForm({ ...editForm, onlineSalesEnabled: v })
                        }
                      />
                    </div>

                    {editForm.onlineSalesEnabled &&
                    packageSettings &&
                    !packageSettings.stripeReady ? (
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

                    {editForm.onlineSalesEnabled ? (
                      <div className="space-y-2">
                        <Label>Direct link</Label>
                        {packageDirectLink ? (
                          <div className="flex gap-2">
                            <Input readOnly value={packageDirectLink} />
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Open package purchase page"
                              nativeButton={false}
                              render={
                                <a
                                  href={packageDirectLink}
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
                                  packageDirectLink,
                                  "Link",
                                )
                              }
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {onlineSalesDirty
                              ? "Save this package to generate your direct link."
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
                        placeholder="Shown on the public package page"
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
                      <Button onClick={() => saveTemplate.mutate(editForm)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </SettingsCard>
              ) : null}

              {tab === "agreement" ? (
                <SettingsCard title="Package agreement">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Require package agreement</Label>
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
                      <Button onClick={() => saveTemplate.mutate(editForm)}>
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
                        commissionBasis: v as PackageCommissionBasis,
                      };
                      setEditForm(next);
                      saveTemplate.mutate(next);
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
            <DialogTitle>Create Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                selectOnFocus
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || !newPrice}
              onClick={() => createTemplate.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
