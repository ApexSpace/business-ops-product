"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
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
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addOfferDiscount,
  deleteOfferDiscount,
  updateOfferDiscount,
} from "@/features/offers/api/offers.api";
import {
  listProductCategories,
  listProducts,
} from "@/features/products/api/products.api";
import { getServicesTree } from "@/features/services/api/service-workspace.api";
import type {
  CreateOfferDiscountInput,
  DiscountAppliesTo,
  DiscountScope,
  Offer,
  OfferDiscount,
} from "@/features/offers/types";
import {
  discountFormToInput,
  discountToForm,
  emptyDiscountForm,
  isDiscountFormValid,
  toggleId,
  type DiscountFormState,
} from "@/features/offers/utils/offer-workspace-utils";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type OfferDiscountsSectionProps = {
  offer: Offer;
  canManage?: boolean;
};

export function OfferDiscountsSection({
  offer,
  canManage = true,
}: OfferDiscountsSectionProps) {
  const queryClient = useQueryClient();
  const [addingDiscount, setAddingDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(
    null,
  );
  const [discountForm, setDiscountForm] =
    useState<DiscountFormState>(emptyDiscountForm);

  const showForm = addingDiscount || !!editingDiscountId;

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    enabled: showForm,
  });

  const productCategoriesQuery = useQuery({
    queryKey: queryKeys.products.categories(),
    queryFn: listProductCategories,
    enabled: showForm,
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({ page: 1, limit: 200 }),
    queryFn: () => listProducts({ page: 1, limit: 200 }),
    enabled: showForm,
  });

  const invalidate = async () => invalidateOffers(queryClient);

  const addDiscountMutation = useMutation({
    mutationFn: (body: CreateOfferDiscountInput) =>
      addOfferDiscount(offer.id, body),
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
      discountId,
      body,
    }: {
      discountId: string;
      body: CreateOfferDiscountInput;
    }) => updateOfferDiscount(offer.id, discountId, body),
    onSuccess: async () => {
      toast.success("Discount updated");
      setEditingDiscountId(null);
      setDiscountForm(emptyDiscountForm());
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: (discountId: string) =>
      deleteOfferDiscount(offer.id, discountId),
    onSuccess: async () => {
      toast.success("Discount removed");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
            categoryName: category.name,
          })),
      ),
    [serviceCategories],
  );

  const productCategories = productCategoriesQuery.data ?? [];
  const products = productsQuery.data?.items ?? [];

  function startAdd() {
    setEditingDiscountId(null);
    setDiscountForm(emptyDiscountForm());
    setAddingDiscount(true);
  }

  function startEdit(discount: OfferDiscount) {
    setAddingDiscount(false);
    setEditingDiscountId(discount.id);
    setDiscountForm(discountToForm(discount));
  }

  function cancelForm() {
    setAddingDiscount(false);
    setEditingDiscountId(null);
    setDiscountForm(emptyDiscountForm());
  }

  function saveForm() {
    if (!isDiscountFormValid(discountForm)) return;
    const body = discountFormToInput(discountForm);
    if (editingDiscountId) {
      updateDiscountMutation.mutate({ discountId: editingDiscountId, body });
    } else {
      addDiscountMutation.mutate(body);
    }
  }

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <h3 className="text-base font-medium">Discounts</h3>
      <div className="space-y-3">
        {offer.discounts.map((discount) => (
          <div
            key={discount.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
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
                  render={<MoreActionsButton aria-label="Discount actions" />}
                />
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => startEdit(discount)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deleteDiscountMutation.mutate(discount.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ))}

        {offer.discounts.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">
            No discounts yet. Add one to define how this offer reduces the sale.
          </p>
        ) : null}

        {showForm ? (
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
            onCancel={cancelForm}
            onSave={saveForm}
          />
        ) : canManage ? (
          <Button type="button" variant="outline" size="sm" onClick={startAdd}>
            Add discount
          </Button>
        ) : null}
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
    <div className="space-y-4 rounded-md border p-4">
      <h4 className="font-medium">
        {editingDiscountId ? "Edit discount" : "Add discount"}
      </h4>

      <div className="space-y-2">
        <Label>Applies to</Label>
        <Select
          value={discountForm.appliesTo}
          onValueChange={(value) => {
            if (!value) return;
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
          <p className="text-xs text-muted-foreground">
            Entire sale discounts must use a fixed dollar amount.
          </p>
        ) : null}
      </div>

      {discountForm.appliesTo === "SERVICES" ? (
        <ScopePicker
          label="Service scope"
          scope={discountForm.serviceScope}
          onScopeChange={(serviceScope) =>
            setDiscountForm({ ...discountForm, serviceScope })
          }
          categoryLabel="Service categories"
          categories={serviceCategories}
          selectedCategoryIds={discountForm.specificServiceCategoryIds}
          onToggleCategory={(id, checked) =>
            setDiscountForm({
              ...discountForm,
              specificServiceCategoryIds: toggleId(
                discountForm.specificServiceCategoryIds,
                id,
                checked,
              ),
            })
          }
          itemLabel="Services"
          items={serviceOptions.map((s) => ({
            id: s.id,
            name: s.categoryName ? `${s.name} (${s.categoryName})` : s.name,
          }))}
          selectedItemIds={discountForm.specificServiceIds}
          onToggleItem={(id, checked) =>
            setDiscountForm({
              ...discountForm,
              specificServiceIds: toggleId(
                discountForm.specificServiceIds,
                id,
                checked,
              ),
            })
          }
        />
      ) : null}

      {discountForm.appliesTo === "PRODUCTS" ? (
        <ScopePicker
          label="Product scope"
          scope={discountForm.productScope}
          onScopeChange={(productScope) =>
            setDiscountForm({ ...discountForm, productScope })
          }
          categoryLabel="Product categories"
          categories={productCategories}
          selectedCategoryIds={discountForm.specificProductCategoryIds}
          onToggleCategory={(id, checked) =>
            setDiscountForm({
              ...discountForm,
              specificProductCategoryIds: toggleId(
                discountForm.specificProductCategoryIds,
                id,
                checked,
              ),
            })
          }
          itemLabel="Products"
          items={products}
          selectedItemIds={discountForm.specificProductIds}
          onToggleItem={(id, checked) =>
            setDiscountForm({
              ...discountForm,
              specificProductIds: toggleId(
                discountForm.specificProductIds,
                id,
                checked,
              ),
            })
          }
        />
      ) : null}

      <SettingsFormActions
        onDiscard={onCancel}
        onSave={onSave}
        isDirty={isDiscountFormValid(discountForm)}
        isSubmitting={savePending}
        saveLabel="Save"
      />
    </div>
  );
}

function ScopePicker({
  label,
  scope,
  onScopeChange,
  categoryLabel,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  itemLabel,
  items,
  selectedItemIds,
  onToggleItem,
}: {
  label: string;
  scope: DiscountScope;
  onScopeChange: (scope: DiscountScope) => void;
  categoryLabel: string;
  categories: Array<{ id: string; name: string }>;
  selectedCategoryIds: string[];
  onToggleCategory: (id: string, checked: boolean) => void;
  itemLabel: string;
  items: Array<{ id: string; name: string }>;
  selectedItemIds: string[];
  onToggleItem: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup
        value={scope}
        onValueChange={(value) => onScopeChange(value as DiscountScope)}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="ALL" id={`${label}-all`} />
          <Label htmlFor={`${label}-all`}>All</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="SPECIFIC" id={`${label}-specific`} />
          <Label htmlFor={`${label}-specific`}>Specific</Label>
        </div>
      </RadioGroup>
      {scope === "SPECIFIC" ? (
        <div className="space-y-4 rounded-md border p-3">
          <div className="space-y-2">
            <Label>{categoryLabel}</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedCategoryIds.includes(category.id)}
                    onCheckedChange={(checked) =>
                      onToggleCategory(category.id, checked === true)
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{itemLabel}</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={(checked) =>
                      onToggleItem(item.id, checked === true)
                    }
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
