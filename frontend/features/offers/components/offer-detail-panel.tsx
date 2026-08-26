"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, X  } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/layout/settings-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  deleteOfferDiscount,
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
  DiscountAppliesTo,
  DiscountScope,
  MembershipCommissionBasis,
  Offer,
  OfferApplicationMode,
  OfferDiscount,
  OfferMembershipScope,
} from "@/features/offers/types";
import {
  applicationModeLabel,
  discountFormToInput,
  discountToForm,
  emptyDiscountForm,
  isDiscountFormValid,
  membershipScopeLabel,
  offerToUpdateInput,
  toggleId,
  type DiscountFormState,
  type OfferTabId,
} from "@/features/offers/utils/offer-workspace-utils";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

export interface OfferDetailPanelProps {
  offer: Offer;
  activeTab: OfferTabId;
  canManage?: boolean;
}

export function OfferDetailPanel({
  offer,
  activeTab,
  canManage = true,
}: OfferDetailPanelProps) {
  const queryClient = useQueryClient();
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [addingDiscount, setAddingDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(
    null,
  );
  const [discountForm, setDiscountForm] =
    useState<DiscountFormState>(emptyDiscountForm);

  const [editForm, setEditForm] = useState<Offer | null>(null);
  const [editSourceKey, setEditSourceKey] = useState<string | null>(null);
  const currentEditSourceKey = `${offer.id}:${offer.updatedAt}`;
  if (currentEditSourceKey !== editSourceKey) {
    setEditSourceKey(currentEditSourceKey);
    setEditForm({ ...offer });
    setDetailsEditing(false);
    setAddingDiscount(false);
    setEditingDiscountId(null);
    setDiscountForm(emptyDiscountForm());
  }

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
    if (!isDiscountFormValid(discountForm)) return;
    const body = discountFormToInput(discountForm);
    if (editingDiscountId) {
      updateDiscountMutation.mutate({
        offerId: offer.id,
        discountId: editingDiscountId,
        body,
      });
    } else {
      addDiscountMutation.mutate({ offerId: offer.id, body });
    }
  }

  function memberLabel(member: {
    id: string;
    user: { firstName?: string | null; lastName?: string | null; email: string,
};
  }) {
    return (
      [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
      member.user.email
    );
  }

  if (activeTab === "details") {
    return (
      <SettingsCard title="Details">
        {detailsEditing ? (
          <DetailsEditForm
            editForm={editForm}
            setEditForm={setEditForm}
            membershipPlans={membershipPlans}
            teamMembers={teamMembers}
            memberLabel={memberLabel}
            savePending={saveDetails.isPending}
            onCancel={() => {
              setDetailsEditing(false);
              setEditForm({ ...offer });
            }}
            onSave={() => editForm && saveDetails.mutate(editForm)}
          />
        ) : (
          <DetailsReadOnly
            offer={offer}
            canManage={canManage}
            onEdit={() => setDetailsEditing(true)}
          />
        )}
      </SettingsCard>
    );
  }

  if (activeTab === "discounts") {
    return (
      <SettingsCard title="Discounts">
        <div className="space-y-3">
          {offer.discounts.map((discount) => (
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
              {canManage ? (
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
                          offerId: offer.id,
                          discountId: discount.id,
                        })
                      }
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ))}

          {showDiscountForm ? (
            <DiscountForm
              discountForm={discountForm}
              setDiscountForm={setDiscountForm}
              editingDiscountId={editingDiscountId}
              serviceCategories={serviceCategories}
              serviceOptions={serviceOptions}
              productCategories={productCategories}
              products={products}
              savePending={
                addDiscountMutation.isPending || updateDiscountMutation.isPending
              }
              onCancel={cancelDiscountForm}
              onSave={saveDiscountForm}
            />
          ) : canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startAddDiscount}
            >
              Add discount
            </Button>
          ) : null}
        </div>
      </SettingsCard>
    );
  }

  if (!editForm) return null;

  return (
    <SettingsCard title="How is service commission calculated?">
      <RadioGroup
        value={editForm.commissionBasis}
        onValueChange={(value) => {
          if (!canManage) return;
          const commissionBasis = value as MembershipCommissionBasis;
          setEditForm({ ...editForm, commissionBasis });
          saveAdvanced.mutate({
            id: editForm.id,
            commissionBasis,
          });
        }}
        disabled={!canManage}
      >
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="REGULAR_PRICE" id="comm-regular" />
            <Label htmlFor="comm-regular">Based on regular price</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Commission will be calculated based on the regular service price.
          </p>
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="DISCOUNTED_PRICE" id="comm-discounted" />
            <Label htmlFor="comm-discounted">Based on discounted price</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Commission will be calculated based on the discounted service price.
          </p>
        </div>
      </RadioGroup>
    </SettingsCard>
  );
}

function DetailsReadOnly({
  offer,
  canManage,
  onEdit,
}: {
  offer: Offer;
  canManage: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs">Name</p>
          <p className="font-medium">{offer.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Application mode</p>
          <p>
            {applicationModeLabel(offer.applicationMode, offer.offerCode)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-muted-foreground text-xs">Internal description</p>
          <p>{offer.description?.trim() || "—"}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Eligibility</p>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {offer.minAmountEnabled ? (
            <li>Minimum sale amount: ${offer.minAmount ?? "0"}</li>
          ) : null}
          {offer.oncePerClient ? <li>Once per client</li> : null}
          {offer.newClientsOnly ? <li>New clients only</li> : null}
          {offer.membershipRequired ? (
            <li>
              Membership required — {membershipScopeLabel(offer.membershipScope)}
            </li>
          ) : null}
          {offer.specificProvidersEnabled ? (
            <li>Specific providers only</li>
          ) : null}
          {!offer.minAmountEnabled &&
          !offer.oncePerClient &&
          !offer.newClientsOnly &&
          !offer.membershipRequired &&
          !offer.specificProvidersEnabled ? (
            <li>No additional eligibility restrictions</li>
          ) : null}
        </ul>
      </div>

      {canManage ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DetailsEditForm({
  editForm,
  setEditForm,
  membershipPlans,
  teamMembers,
  memberLabel,
  savePending,
  onCancel,
  onSave,
}: {
  editForm: Offer | null;
  setEditForm: React.Dispatch<React.SetStateAction<Offer | null>>;
  membershipPlans: Array<{ id: string; name: string }>;
  teamMembers: Array<{
    id: string;
    user: { firstName?: string | null; lastName?: string | null; email: string,
};
  }>;
  memberLabel: (member: {
    id: string;
    user: { firstName?: string | null; lastName?: string | null; email: string,
};
  }) => string;
  savePending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
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
                      ? (editForm.membershipScope ?? "ANY")
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
                        ? (editForm.specificMembershipPlanIds ?? [])
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
                      ? (editForm.specificProviderIds ?? [])
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!editForm.name.trim() || savePending}
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function DiscountForm({
  discountForm,
  setDiscountForm,
  editingDiscountId,
  serviceCategories,
  serviceOptions,
  productCategories,
  products,
  savePending,
  onCancel,
  onSave,
}: {
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
  editingDiscountId: string | null;
  serviceCategories: Array<{ id: string; name: string }>;
  serviceOptions: Array<{
    id: string;
    name: string;
    categoryName: string;
  }>;
  productCategories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  savePending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const percentDisabled = discountForm.appliesTo === "ENTIRE_SALE";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          {editingDiscountId ? "Edit discount" : "Add discount"}
        </h3>
        <Button variant="ghost" size="icon-sm" onClick={onCancel}>
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
                discountForm.amountType === "PERCENTAGE" ? "secondary" : "ghost"
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!isDiscountFormValid(discountForm) || savePending}
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
