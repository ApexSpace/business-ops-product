"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EmptyState } from "@/components/data-display/empty-state";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { SettingsCard } from "@/components/layout/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OfferDateRuleBuilder } from "@/features/offers/components/offer-date-rule-builder";
import {
  addOfferDiscount,
  createOffer,
  deleteOffer,
  deleteOfferDiscount,
  disableOffer,
  duplicateOffer,
  enableOffer,
  listOffers,
  updateOfferDetails,
  updateOfferDiscount,
} from "@/features/offers/api/offers.api";
import { listMembershipPlans } from "@/features/memberships/api/memberships.api";
import {
  listProductCategories,
  listProducts,
} from "@/features/products/api/products.api";
import { getServicesTree } from "@/features/services/api/service-workspace.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import type {
  CreateOfferDiscountInput,
  DiscountAmountType,
  DiscountAppliesTo,
  DiscountScope,
  MembershipCommissionBasis,
  Offer,
  OfferApplicationMode,
  OfferDiscount,
  OfferMembershipScope,
  UpdateOfferDetailsInput,
} from "@/features/offers/types";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "details", label: "Details" },
  { id: "discounts", label: "Discounts" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type DiscountFormState = {
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: string;
  serviceScope: DiscountScope;
  productScope: DiscountScope;
  specificServiceCategoryIds: string[];
  specificServiceIds: string[];
  specificProductCategoryIds: string[];
  specificProductIds: string[];
};

function emptyDiscountForm(): DiscountFormState {
  return {
    appliesTo: "SERVICES",
    amountType: "PERCENTAGE",
    amount: "",
    serviceScope: "ALL",
    productScope: "ALL",
    specificServiceCategoryIds: [],
    specificServiceIds: [],
    specificProductCategoryIds: [],
    specificProductIds: [],
  };
}

function discountToForm(discount: OfferDiscount): DiscountFormState {
  return {
    appliesTo: discount.appliesTo,
    amountType: discount.amountType,
    amount: discount.amount,
    serviceScope: discount.serviceScope,
    productScope: discount.productScope,
    specificServiceCategoryIds: discount.specificServiceCategoryIds ?? [],
    specificServiceIds: discount.specificServiceIds ?? [],
    specificProductCategoryIds: discount.specificProductCategoryIds ?? [],
    specificProductIds: discount.specificProductIds ?? [],
  };
}

function discountFormToInput(form: DiscountFormState): CreateOfferDiscountInput {
  return {
    appliesTo: form.appliesTo,
    amountType:
      form.appliesTo === "ENTIRE_SALE" ? "FIXED" : form.amountType,
    amount: Number(form.amount),
    serviceScope: form.appliesTo === "SERVICES" ? form.serviceScope : undefined,
    productScope: form.appliesTo === "PRODUCTS" ? form.productScope : undefined,
    specificServiceCategoryIds:
      form.appliesTo === "SERVICES" &&
      form.serviceScope === "SPECIFIC" &&
      form.specificServiceCategoryIds.length
        ? form.specificServiceCategoryIds
        : undefined,
    specificServiceIds:
      form.appliesTo === "SERVICES" &&
      form.serviceScope === "SPECIFIC" &&
      form.specificServiceIds.length
        ? form.specificServiceIds
        : undefined,
    specificProductCategoryIds:
      form.appliesTo === "PRODUCTS" &&
      form.productScope === "SPECIFIC" &&
      form.specificProductCategoryIds.length
        ? form.specificProductCategoryIds
        : undefined,
    specificProductIds:
      form.appliesTo === "PRODUCTS" &&
      form.productScope === "SPECIFIC" &&
      form.specificProductIds.length
        ? form.specificProductIds
        : undefined,
  };
}

function isDiscountFormValid(form: DiscountFormState): boolean {
  const amount = Number(form.amount);
  if (!form.amount.trim() || Number.isNaN(amount) || amount <= 0) return false;
  if (form.appliesTo === "ENTIRE_SALE" && form.amountType === "PERCENTAGE") {
    return false;
  }
  if (
    form.appliesTo === "SERVICES" &&
    form.serviceScope === "SPECIFIC" &&
    form.specificServiceCategoryIds.length === 0 &&
    form.specificServiceIds.length === 0
  ) {
    return false;
  }
  if (
    form.appliesTo === "PRODUCTS" &&
    form.productScope === "SPECIFIC" &&
    form.specificProductCategoryIds.length === 0 &&
    form.specificProductIds.length === 0
  ) {
    return false;
  }
  return true;
}

function offerToUpdateInput(offer: Offer): UpdateOfferDetailsInput {
  return {
    name: offer.name,
    description: offer.description ?? undefined,
    applicationMode: offer.applicationMode,
    offerCode: offer.offerCode ?? undefined,
    autoApptDateEnabled: offer.autoApptDateEnabled,
    autoApptDateRules: offer.autoApptDateRules ?? undefined,
    autoBookingDateEnabled: offer.autoBookingDateEnabled,
    autoBookingDateRules: offer.autoBookingDateRules ?? undefined,
    autoSaleDateEnabled: offer.autoSaleDateEnabled,
    autoSaleDateRules: offer.autoSaleDateRules ?? undefined,
    minAmountEnabled: offer.minAmountEnabled,
    minAmount:
      offer.minAmount != null && offer.minAmount !== ""
        ? Number(offer.minAmount)
        : undefined,
    oncePerClient: offer.oncePerClient,
    newClientsOnly: offer.newClientsOnly,
    membershipRequired: offer.membershipRequired,
    membershipScope: offer.membershipScope ?? undefined,
    specificMembershipPlanIds: offer.specificMembershipPlanIds ?? undefined,
    specificProvidersEnabled: offer.specificProvidersEnabled,
    specificProviderIds: offer.specificProviderIds ?? undefined,
    commissionBasis: offer.commissionBasis,
  };
}

function applicationModeLabel(mode: OfferApplicationMode, code?: string | null) {
  switch (mode) {
    case "STAFF_ONLY":
      return "Staff only";
    case "OFFER_CODE":
      return code ? `Offer code: ${code}` : "Offer code";
    case "AUTOMATICALLY":
      return "Automatically applied";
    default:
      return mode;
  }
}

function membershipScopeLabel(scope?: OfferMembershipScope | null) {
  if (scope === "SPECIFIC") return "Specific membership plans";
  if (scope === "ANY") return "Any membership";
  return "—";
}

function toggleId(ids: string[], id: string, checked: boolean) {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((value) => value !== id);
}

export function OffersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("details");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addingDiscount, setAddingDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(
    null,
  );
  const [discountForm, setDiscountForm] =
    useState<DiscountFormState>(emptyDiscountForm);

  const offersQuery = useQuery({
    queryKey: queryKeys.offers.list(search.trim() || undefined),
    queryFn: () => listOffers(search.trim() || undefined),
  });

  const membershipPlansQuery = useQuery({
    queryKey: queryKeys.memberships.plans(),
    queryFn: () => listMembershipPlans(),
    enabled: detailsEditing,
  });

  const teamQuery = useQuery({
    queryKey: queryKeys.business.members({ limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: detailsEditing,
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    enabled: addingDiscount || !!editingDiscountId,
  });

  const productCategoriesQuery = useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: listProductCategories,
    enabled: addingDiscount || !!editingDiscountId,
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ page: 1, limit: 200 }),
    queryFn: () => listProducts({ page: 1, limit: 200 }),
    enabled: addingDiscount || !!editingDiscountId,
  });

  const offers = useMemo(() => offersQuery.data ?? [], [offersQuery.data]);
  const activeSelectedId = selectedId ?? offers[0]?.id ?? null;
  const selected = useMemo(
    () => offers.find((offer) => offer.id === activeSelectedId) ?? null,
    [offers, activeSelectedId],
  );

  const [editForm, setEditForm] = useState<Offer | null>(null);
  const [editSourceKey, setEditSourceKey] = useState<string | null>(null);
  const currentEditSourceKey = selected
    ? `${selected.id}:${selected.updatedAt}`
    : null;
  if (currentEditSourceKey !== editSourceKey) {
    setEditSourceKey(currentEditSourceKey);
    setEditForm(selected ? { ...selected } : null);
    setDetailsEditing(false);
  }

  const invalidate = async () => invalidateOffers(queryClient);

  const saveDetails = useMutation({
    mutationFn: (body: Offer) =>
      updateOfferDetails(body.id, offerToUpdateInput(body)),
    onSuccess: async () => {
      toast.success("Offer saved");
      setDetailsEditing(false);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAdvanced = useMutation({
    mutationFn: ({
      id,
      commissionBasis,
    }: {
      id: string;
      commissionBasis: MembershipCommissionBasis;
    }) => updateOfferDetails(id, { commissionBasis }),
    onSuccess: async () => {
      toast.success("Advanced settings saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createOfferMutation = useMutation({
    mutationFn: () =>
      createOffer({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      }),
    onSuccess: async (offer) => {
      toast.success("Offer created");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setSelectedId(offer.id);
      setTab("details");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? enableOffer(id) : disableOffer(id),
    onSuccess: async (_, { enabled }) => {
      toast.success(enabled ? "Offer enabled" : "Offer disabled");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateOfferMutation = useMutation({
    mutationFn: duplicateOffer,
    onSuccess: async (offer) => {
      toast.success("Offer duplicated");
      setSelectedId(offer.id);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOfferMutation = useMutation({
    mutationFn: deleteOffer,
    onSuccess: async () => {
      toast.success("Offer deleted");
      setDeleteOpen(false);
      setSelectedId(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addDiscountMutation = useMutation({
    mutationFn: ({
      offerId,
      body,
    }: {
      offerId: string;
      body: CreateOfferDiscountInput;
    }) => addOfferDiscount(offerId, body),
    onSuccess: async () => {
      toast.success("Discount added");
      setAddingDiscount(false);
      setDiscountForm(emptyDiscountForm());
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDiscountMutation = useMutation({
    mutationFn: ({
      offerId,
      discountId,
      body,
    }: {
      offerId: string;
      discountId: string;
      body: CreateOfferDiscountInput;
    }) => updateOfferDiscount(offerId, discountId, body),
    onSuccess: async () => {
      toast.success("Discount updated");
      setEditingDiscountId(null);
      setDiscountForm(emptyDiscountForm());
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: ({
      offerId,
      discountId,
    }: {
      offerId: string;
      discountId: string;
    }) => deleteOfferDiscount(offerId, discountId),
    onSuccess: async () => {
      toast.success("Discount removed");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const membershipPlans = useMemo(
    () => (membershipPlansQuery.data ?? []).filter((plan) => !plan.isArchived),
    [membershipPlansQuery.data],
  );

  const teamMembers = useMemo(
    () =>
      (teamQuery.data?.items ?? []).filter(
        (member) => member.status === "ACTIVE",
      ),
    [teamQuery.data?.items],
  );

  const serviceCategories = useMemo(
    () => servicesQuery.data?.categories ?? [],
    [servicesQuery.data?.categories],
  );

  const serviceOptions = useMemo(
    () =>
      serviceCategories.flatMap((category) =>
        category.services
          .filter((service) => service.status === "ACTIVE" && !service.isDemo)
          .map((service) => ({
            id: service.id,
            name: service.name,
            categoryId: category.id,
            categoryName: category.name,
          })),
      ),
    [serviceCategories],
  );

  const productCategories = productCategoriesQuery.data ?? [];
  const products = productsQuery.data?.items ?? [];

  const showDiscountForm = addingDiscount || !!editingDiscountId;

  function startAddDiscount() {
    setEditingDiscountId(null);
    setDiscountForm(emptyDiscountForm());
    setAddingDiscount(true);
  }

  function startEditDiscount(discount: OfferDiscount) {
    setAddingDiscount(false);
    setEditingDiscountId(discount.id);
    setDiscountForm(discountToForm(discount));
  }

  function cancelDiscountForm() {
    setAddingDiscount(false);
    setEditingDiscountId(null);
    setDiscountForm(emptyDiscountForm());
  }

  function saveDiscountForm() {
    if (!selected || !isDiscountFormValid(discountForm)) return;
    const body = discountFormToInput(discountForm);
    if (editingDiscountId) {
      updateDiscountMutation.mutate({
        offerId: selected.id,
        discountId: editingDiscountId,
        body,
      });
    } else {
      addDiscountMutation.mutate({ offerId: selected.id, body });
    }
  }

  function memberLabel(member: (typeof teamMembers)[number]) {
    return (
      [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
      member.user.email
    );
  }

  function renderDiscountForm() {
    const percentDisabled = discountForm.appliesTo === "ENTIRE_SALE";

    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">
            {editingDiscountId ? "Edit discount" : "Add discount"}
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={cancelDiscountForm}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Applies to</Label>
          <Select
            value={discountForm.appliesTo}
            onValueChange={(value) => {
              const appliesTo = value as DiscountAppliesTo;
              setDiscountForm((prev) => ({
                ...prev,
                appliesTo,
                amountType:
                  appliesTo === "ENTIRE_SALE" ? "FIXED" : prev.amountType,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SERVICES">Services</SelectItem>
              <SelectItem value="PRODUCTS">Products</SelectItem>
              <SelectItem value="ENTIRE_SALE">Entire sale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={discountForm.amount}
              onChange={(e) =>
                setDiscountForm({ ...discountForm, amount: e.target.value })
              }
              className="flex-1"
            />
            <div className="flex rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={
                  discountForm.amountType === "PERCENTAGE"
                    ? "secondary"
                    : "ghost"
                }
                className="min-w-10 px-3"
                disabled={percentDisabled}
                onClick={() =>
                  setDiscountForm({ ...discountForm, amountType: "PERCENTAGE" })
                }
              >
                %
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  discountForm.amountType === "FIXED" ? "secondary" : "ghost"
                }
                className="min-w-10 px-3"
                onClick={() =>
                  setDiscountForm({ ...discountForm, amountType: "FIXED" })
                }
              >
                $
              </Button>
            </div>
          </div>
          {percentDisabled ? (
            <p className="text-muted-foreground text-xs">
              Entire sale discounts must use a fixed dollar amount.
            </p>
          ) : null}
        </div>

        {discountForm.appliesTo === "SERVICES" ? (
          <div className="space-y-3">
            <Label>Service scope</Label>
            <RadioGroup
              value={discountForm.serviceScope}
              onValueChange={(value) =>
                setDiscountForm({
                  ...discountForm,
                  serviceScope: value as DiscountScope,
                })
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ALL" id="service-scope-all" />
                <Label htmlFor="service-scope-all">All services</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="SPECIFIC" id="service-scope-specific" />
                <Label htmlFor="service-scope-specific">Specific services</Label>
              </div>
            </RadioGroup>

            {discountForm.serviceScope === "SPECIFIC" ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>Service categories</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {serviceCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={discountForm.specificServiceCategoryIds.includes(
                            category.id,
                          )}
                          onCheckedChange={(checked) =>
                            setDiscountForm({
                              ...discountForm,
                              specificServiceCategoryIds: toggleId(
                                discountForm.specificServiceCategoryIds,
                                category.id,
                                checked === true,
                              ),
                            })
                          }
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Services</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {serviceOptions.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={discountForm.specificServiceIds.includes(
                            service.id,
                          )}
                          onCheckedChange={(checked) =>
                            setDiscountForm({
                              ...discountForm,
                              specificServiceIds: toggleId(
                                discountForm.specificServiceIds,
                                service.id,
                                checked === true,
                              ),
                            })
                          }
                        />
                        {service.categoryName
                          ? `${service.name} (${service.categoryName})`
                          : service.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {discountForm.appliesTo === "PRODUCTS" ? (
          <div className="space-y-3">
            <Label>Product scope</Label>
            <RadioGroup
              value={discountForm.productScope}
              onValueChange={(value) =>
                setDiscountForm({
                  ...discountForm,
                  productScope: value as DiscountScope,
                })
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ALL" id="product-scope-all" />
                <Label htmlFor="product-scope-all">All products</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="SPECIFIC" id="product-scope-specific" />
                <Label htmlFor="product-scope-specific">Specific products</Label>
              </div>
            </RadioGroup>

            {discountForm.productScope === "SPECIFIC" ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>Product categories</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {productCategories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={discountForm.specificProductCategoryIds.includes(
                            category.id,
                          )}
                          onCheckedChange={(checked) =>
                            setDiscountForm({
                              ...discountForm,
                              specificProductCategoryIds: toggleId(
                                discountForm.specificProductCategoryIds,
                                category.id,
                                checked === true,
                              ),
                            })
                          }
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Products</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={discountForm.specificProductIds.includes(
                            product.id,
                          )}
                          onCheckedChange={(checked) =>
                            setDiscountForm({
                              ...discountForm,
                              specificProductIds: toggleId(
                                discountForm.specificProductIds,
                                product.id,
                                checked === true,
                              ),
                            })
                          }
                        />
                        {product.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cancelDiscountForm}>
            Cancel
          </Button>
          <Button
            disabled={
              !isDiscountFormValid(discountForm) ||
              addDiscountMutation.isPending ||
              updateDiscountMutation.isPending
            }
            onClick={saveDiscountForm}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  function renderDetailsReadOnly() {
    if (!selected) return null;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="font-medium">{selected.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Application mode</p>
            <p>{applicationModeLabel(selected.applicationMode, selected.offerCode)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs">Internal description</p>
            <p>{selected.description?.trim() || "—"}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Eligibility</p>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {selected.minAmountEnabled ? (
              <li>Minimum sale amount: ${selected.minAmount ?? "0"}</li>
            ) : null}
            {selected.oncePerClient ? <li>Once per client</li> : null}
            {selected.newClientsOnly ? <li>New clients only</li> : null}
            {selected.membershipRequired ? (
              <li>
                Membership required —{" "}
                {membershipScopeLabel(selected.membershipScope)}
              </li>
            ) : null}
            {selected.specificProvidersEnabled ? (
              <li>Specific providers only</li>
            ) : null}
            {!selected.minAmountEnabled &&
            !selected.oncePerClient &&
            !selected.newClientsOnly &&
            !selected.membershipRequired &&
            !selected.specificProvidersEnabled ? (
              <li>No additional eligibility restrictions</li>
            ) : null}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setDetailsEditing(true)}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        </div>
      </div>
    );
  }

  function renderDetailsEditForm() {
    if (!editForm) return null;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm font-medium">Basic info</p>
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Internal description</Label>
              <Textarea
                rows={3}
                value={editForm.description ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium">Application mode</p>
          <RadioGroup
            value={editForm.applicationMode}
            onValueChange={(value) =>
              setEditForm({
                ...editForm,
                applicationMode: value as OfferApplicationMode,
              })
            }
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="STAFF_ONLY" id="mode-staff" />
              <Label htmlFor="mode-staff">Staff only</Label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="OFFER_CODE" id="mode-code" />
                <Label htmlFor="mode-code">Offer code</Label>
              </div>
              {editForm.applicationMode === "OFFER_CODE" ? (
                <Input
                  className="max-w-xs uppercase"
                  value={editForm.offerCode ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      offerCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="OFFERCODE"
                />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="AUTOMATICALLY" id="mode-auto" />
              <Label htmlFor="mode-auto">Automatically</Label>
            </div>
          </RadioGroup>

          {editForm.applicationMode === "AUTOMATICALLY" ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Appointment date</Label>
                  <Switch
                    checked={editForm.autoApptDateEnabled}
                    onCheckedChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        autoApptDateEnabled: checked,
                      })
                    }
                  />
                </div>
                {editForm.autoApptDateEnabled ? (
                  <OfferDateRuleBuilder
                    rules={editForm.autoApptDateRules ?? []}
                    onChange={(rules) =>
                      setEditForm({ ...editForm, autoApptDateRules: rules })
                    }
                  />
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Booking date</Label>
                  <Switch
                    checked={editForm.autoBookingDateEnabled}
                    onCheckedChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        autoBookingDateEnabled: checked,
                      })
                    }
                  />
                </div>
                {editForm.autoBookingDateEnabled ? (
                  <OfferDateRuleBuilder
                    rules={editForm.autoBookingDateRules ?? []}
                    onChange={(rules) =>
                      setEditForm({ ...editForm, autoBookingDateRules: rules })
                    }
                  />
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Sale date</Label>
                  <Switch
                    checked={editForm.autoSaleDateEnabled}
                    onCheckedChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        autoSaleDateEnabled: checked,
                      })
                    }
                  />
                </div>
                {editForm.autoSaleDateEnabled ? (
                  <OfferDateRuleBuilder
                    rules={editForm.autoSaleDateRules ?? []}
                    onChange={(rules) =>
                      setEditForm({ ...editForm, autoSaleDateRules: rules })
                    }
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium">Eligibility</p>
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Minimum sale amount</Label>
                <Switch
                  checked={editForm.minAmountEnabled}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, minAmountEnabled: checked })
                  }
                />
              </div>
              {editForm.minAmountEnabled ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="max-w-[160px]"
                  value={editForm.minAmount ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, minAmount: e.target.value })
                  }
                />
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label>Once per client</Label>
              <Switch
                checked={editForm.oncePerClient}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, oncePerClient: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label>New clients only</Label>
              <Switch
                checked={editForm.newClientsOnly}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, newClientsOnly: checked })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Membership required</Label>
                <Switch
                  checked={editForm.membershipRequired}
                  onCheckedChange={(checked) =>
                    setEditForm({
                      ...editForm,
                      membershipRequired: checked,
                      membershipScope: checked
                        ? editForm.membershipScope ?? "ANY"
                        : null,
                    })
                  }
                />
              </div>
              {editForm.membershipRequired ? (
                <RadioGroup
                  value={editForm.membershipScope ?? "ANY"}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      membershipScope: value as OfferMembershipScope,
                      specificMembershipPlanIds:
                        value === "SPECIFIC"
                          ? editForm.specificMembershipPlanIds ?? []
                          : [],
                    })
                  }
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ANY" id="membership-any" />
                    <Label htmlFor="membership-any">Any membership</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="SPECIFIC" id="membership-specific" />
                    <Label htmlFor="membership-specific">
                      Specific membership plans
                    </Label>
                  </div>
                </RadioGroup>
              ) : null}
              {editForm.membershipRequired &&
              editForm.membershipScope === "SPECIFIC" ? (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {membershipPlans.map((plan) => (
                    <label
                      key={plan.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={(
                          editForm.specificMembershipPlanIds ?? []
                        ).includes(plan.id)}
                        onCheckedChange={(checked) =>
                          setEditForm({
                            ...editForm,
                            specificMembershipPlanIds: toggleId(
                              editForm.specificMembershipPlanIds ?? [],
                              plan.id,
                              checked === true,
                            ),
                          })
                        }
                      />
                      {plan.name}
                    </label>
                  ))}
                  {membershipPlans.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No membership plans available.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Specific providers</Label>
                <Switch
                  checked={editForm.specificProvidersEnabled}
                  onCheckedChange={(checked) =>
                    setEditForm({
                      ...editForm,
                      specificProvidersEnabled: checked,
                      specificProviderIds: checked
                        ? editForm.specificProviderIds ?? []
                        : [],
                    })
                  }
                />
              </div>
              {editForm.specificProvidersEnabled ? (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={(editForm.specificProviderIds ?? []).includes(
                          member.id,
                        )}
                        onCheckedChange={(checked) =>
                          setEditForm({
                            ...editForm,
                            specificProviderIds: toggleId(
                              editForm.specificProviderIds ?? [],
                              member.id,
                              checked === true,
                            ),
                          })
                        }
                      />
                      {memberLabel(member)}
                    </label>
                  ))}
                  {teamMembers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No active team members found.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDetailsEditing(false);
              if (selected) setEditForm({ ...selected });
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!editForm.name.trim() || saveDetails.isPending}
            onClick={() => saveDetails.mutate(editForm)}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)] pt-[var(--page-content-top-gap)] max-lg:grid-rows-[minmax(0,auto)_minmax(0,1fr)] lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:grid-rows-1">
        <section className="flex max-h-[40vh] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs lg:max-h-none">
          <ListToolbar
            className="rounded-none border-0 border-b bg-transparent p-3 shadow-none sm:px-4"
            search={
              <Input
                placeholder="Search offers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1"
              />
            }
            actions={
              <>
                <Button
                  size="icon-sm"
                  className="sm:hidden"
                  aria-label="Create offer"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  size="sm"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="mr-1.5 size-4" />
                  Create offer
                </Button>
              </>
            }
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/5",
                      activeSelectedId === offer.id &&
                        "bg-primary-tint/40 font-medium shadow-[inset_3px_0_0_0_var(--color-primary)]",
                    )}
                    onClick={() => setSelectedId(offer.id)}
                  >
                    <span className="truncate">{offer.name}</span>
                    <Badge
                      variant={offer.isEnabled ? "success" : "neutral"}
                      className="shrink-0"
                    >
                      {offer.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
            {!offersQuery.isLoading && offers.length === 0 ? (
              <div className="px-2 py-6">
                <EmptyState
                  icon={
                    <Tag className="size-5 text-muted-foreground/70" aria-hidden />
                  }
                  title="No offers yet"
                  description="Create your first promotional offer to get started."
                  action={
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-1.5 size-4" />
                      Create offer
                    </Button>
                  }
                />
              </div>
            ) : null}
          </div>
          {offers.length > 0 ? (
            <div className="shrink-0 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {offers.length} offer{offers.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
          {!selected || !editForm ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8">
              <EmptyState
                icon={
                  <Tag className="size-5 text-muted-foreground/70" aria-hidden />
                }
                title="Select an offer"
                description="Choose an offer from the list or create a new one."
                action={
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Create offer
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-tight">
                      {selected.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {applicationModeLabel(
                        selected.applicationMode,
                        selected.offerCode,
                      )}
                      {selected.discountCount != null
                        ? ` · ${selected.discountCount} discount${selected.discountCount === 1 ? "" : "s"}`
                        : selected.discounts.length
                          ? ` · ${selected.discounts.length} discount${selected.discounts.length === 1 ? "" : "s"}`
                          : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggleEnabled.isPending}
                      className={cn(
                        selected.isEnabled &&
                          "border-destructive/30 text-destructive hover:bg-destructive-subtle",
                      )}
                      onClick={() =>
                        toggleEnabled.mutate({
                          id: selected.id,
                          enabled: !selected.isEnabled,
                        })
                      }
                    >
                      {selected.isEnabled ? "Disable" : "Enable"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Offer actions</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            duplicateOfferMutation.mutate(selected.id)
                          }
                        >
                          <Copy className="mr-2 size-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <nav className="flex gap-1 border-b border-border px-4">
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "border-b-2 px-3 py-2.5 text-sm transition-colors sm:px-4",
                        tab === item.id
                          ? "border-primary font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setTab(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="p-4">
                  {tab === "details" ? (
                    <SettingsCard title="Details">
                      {detailsEditing
                        ? renderDetailsEditForm()
                        : renderDetailsReadOnly()}
                    </SettingsCard>
                  ) : null}

                  {tab === "discounts" ? (
                    <SettingsCard title="Discounts">
                      <div className="space-y-3">
                        {selected.discounts.map((discount) => (
                          <div
                            key={discount.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3"
                          >
                            <div>
                              <p className="font-medium">{discount.summary}</p>
                              {discount.subtext ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {discount.subtext}
                                </p>
                              ) : null}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => startEditDiscount(discount)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    deleteDiscountMutation.mutate({
                                      offerId: selected.id,
                                      discountId: discount.id,
                                    })
                                  }
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}

                        {showDiscountForm ? (
                          renderDiscountForm()
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={startAddDiscount}
                          >
                            <Plus className="mr-1.5 size-4" />
                            Add discount
                          </Button>
                        )}
                      </div>
                    </SettingsCard>
                  ) : null}

                  {tab === "advanced" ? (
                    <SettingsCard title="How is service commission calculated?">
                      <RadioGroup
                        value={editForm.commissionBasis}
                        onValueChange={(value) => {
                          const commissionBasis =
                            value as MembershipCommissionBasis;
                          setEditForm({ ...editForm, commissionBasis });
                          saveAdvanced.mutate({
                            id: editForm.id,
                            commissionBasis,
                          });
                        }}
                      >
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="REGULAR_PRICE"
                              id="comm-regular"
                            />
                            <Label htmlFor="comm-regular">
                              Based on regular price
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Commission will be calculated based on the regular
                            service price.
                          </p>
                        </div>
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="DISCOUNTED_PRICE"
                              id="comm-discounted"
                            />
                            <Label htmlFor="comm-discounted">
                              Based on discounted price
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Commission will be calculated based on the discounted
                            service price.
                          </p>
                        </div>
                      </RadioGroup>
                    </SettingsCard>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || createOfferMutation.isPending}
              onClick={() => createOfferMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete offer?"
        description="This offer will be permanently removed. This action cannot be undone."
        isPending={deleteOfferMutation.isPending}
        onConfirm={() => selected && deleteOfferMutation.mutate(selected.id)}
      />
    </div>
  );
}
