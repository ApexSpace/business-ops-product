"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { AmountUnitToggle } from "@/components/ui/amount-unit-toggle";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { Badge } from "@/components/ui/badge";
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

type PickerItem = { id: string; name: string };

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
      {!showForm ? (
        <div className="space-y-[var(--spacing-4)]">
          {offer.discounts.map((discount) => (
            <section
              key={discount.id}
              className="space-y-[var(--spacing-3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  onClick={() => {
                    if (canManage) startEdit(discount);
                  }}
                  disabled={!canManage}
                >
                  <h3 className="text-base font-medium">Discount</h3>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {discount.summary}
                  </p>
                  {discount.subtext ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {discount.subtext}
                    </p>
                  ) : null}
                </button>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <MoreActionsButton aria-label="Discount actions" />
                      }
                    />
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          deleteDiscountMutation.mutate(discount.id)
                        }
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </section>
          ))}

          {offer.discounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No discounts yet. Add one to define how this offer reduces the
              sale.
            </p>
          ) : null}

          {canManage ? (
            <DrawerAddAction label="Add discount" onClick={startAdd} />
          ) : null}
        </div>
      ) : (
        <DiscountForm
          discountForm={discountForm}
          setDiscountForm={setDiscountForm}
          editingDiscountId={editingDiscountId}
          serviceCategories={serviceCategories.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          serviceOptions={serviceOptions.map((s) => ({
            id: s.id,
            name: s.categoryName ? `${s.name} (${s.categoryName})` : s.name,
          }))}
          productCategories={productCategories.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
          savePending={
            addDiscountMutation.isPending || updateDiscountMutation.isPending
          }
          onCancel={cancelForm}
          onSave={saveForm}
        />
      )}
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
  setDiscountForm: Dispatch<SetStateAction<DiscountFormState>>;
  editingDiscountId: string | null;
  serviceCategories: PickerItem[];
  serviceOptions: PickerItem[];
  productCategories: PickerItem[];
  products: PickerItem[];
  savePending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const percentDisabled = discountForm.appliesTo === "ENTIRE_SALE";

  return (
    <div className="space-y-[var(--spacing-6)]">
      <h3 className="text-base font-medium">
        {editingDiscountId ? "Edit discount" : "New Discount"}
      </h3>

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
            <SelectValue placeholder="Select" />
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
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discountForm.amount}
            onChange={(e) =>
              setDiscountForm({ ...discountForm, amount: e.target.value })
            }
            placeholder="Enter amount"
            className="flex-1"
          />
          <AmountUnitToggle
            value={discountForm.amountType}
            currencyValue="FIXED"
            percentValue="PERCENTAGE"
            percentDisabled={percentDisabled}
            onValueChange={(amountType) =>
              setDiscountForm({ ...discountForm, amountType })
            }
            aria-label="Discount unit"
          />
        </div>
        {percentDisabled ? (
          <p className="text-xs text-muted-foreground">
            Entire sale discounts must use a fixed dollar amount.
          </p>
        ) : null}
      </div>

      {discountForm.appliesTo === "SERVICES" ? (
        <ScopeWithAddPickers
          allLabel="All services"
          allDescription="Discount applies to all services in a sale."
          specificLabel="Specific services"
          specificDescription="Discount only applies to selected services."
          scope={discountForm.serviceScope}
          onScopeChange={(serviceScope) =>
            setDiscountForm({ ...discountForm, serviceScope })
          }
          categoryHeading="All services in categories"
          addCategoryLabel="Add categories"
          categories={serviceCategories}
          selectedCategoryIds={discountForm.specificServiceCategoryIds}
          onChangeCategories={(ids) =>
            setDiscountForm({
              ...discountForm,
              specificServiceCategoryIds: ids,
            })
          }
          itemHeading="Services"
          addItemLabel="Add services"
          items={serviceOptions}
          selectedItemIds={discountForm.specificServiceIds}
          onChangeItems={(ids) =>
            setDiscountForm({ ...discountForm, specificServiceIds: ids })
          }
        />
      ) : null}

      {discountForm.appliesTo === "PRODUCTS" ? (
        <ScopeWithAddPickers
          allLabel="All products"
          allDescription="Discount applies to all products in a sale."
          specificLabel="Specific products"
          specificDescription="Discount only applies to selected products."
          scope={discountForm.productScope}
          onScopeChange={(productScope) =>
            setDiscountForm({ ...discountForm, productScope })
          }
          categoryHeading="All products in categories"
          addCategoryLabel="Add categories"
          categories={productCategories}
          selectedCategoryIds={discountForm.specificProductCategoryIds}
          onChangeCategories={(ids) =>
            setDiscountForm({
              ...discountForm,
              specificProductCategoryIds: ids,
            })
          }
          itemHeading="Products"
          addItemLabel="Add products"
          items={products}
          selectedItemIds={discountForm.specificProductIds}
          onChangeItems={(ids) =>
            setDiscountForm({ ...discountForm, specificProductIds: ids })
          }
        />
      ) : null}

      <SettingsFormActions
        onDiscard={onCancel}
        onSave={onSave}
        isDirty={isDiscountFormValid(discountForm)}
        isSubmitting={savePending}
        saveLabel="Save"
        discardLabel="Discard"
      />
    </div>
  );
}

function ScopeWithAddPickers({
  allLabel,
  allDescription,
  specificLabel,
  specificDescription,
  scope,
  onScopeChange,
  categoryHeading,
  addCategoryLabel,
  categories,
  selectedCategoryIds,
  onChangeCategories,
  itemHeading,
  addItemLabel,
  items,
  selectedItemIds,
  onChangeItems,
}: {
  allLabel: string;
  allDescription: string;
  specificLabel: string;
  specificDescription: string;
  scope: DiscountScope;
  onScopeChange: (scope: DiscountScope) => void;
  categoryHeading: string;
  addCategoryLabel: string;
  categories: PickerItem[];
  selectedCategoryIds: string[];
  onChangeCategories: (ids: string[]) => void;
  itemHeading: string;
  addItemLabel: string;
  items: PickerItem[];
  selectedItemIds: string[];
  onChangeItems: (ids: string[]) => void;
}) {
  return (
    <SettingsChoiceRadioGroup
      name={`scope-${allLabel}`}
      aria-label={allLabel}
      value={scope}
      onValueChange={(value) => onScopeChange(value as DiscountScope)}
      options={[
        {
          value: "ALL",
          label: allLabel,
          description: allDescription,
        },
        {
          value: "SPECIFIC",
          label: specificLabel,
          description: specificDescription,
          children: (
            <div className="space-y-[var(--spacing-4)]">
              <AddPickerBlock
                heading={categoryHeading}
                addLabel={addCategoryLabel}
                options={categories}
                selectedIds={selectedCategoryIds}
                onChange={onChangeCategories}
              />
              <AddPickerBlock
                heading={itemHeading}
                addLabel={addItemLabel}
                options={items}
                selectedIds={selectedItemIds}
                onChange={onChangeItems}
              />
            </div>
          ),
        },
      ]}
    />
  );
}

function AddPickerBlock({
  heading,
  addLabel,
  options,
  selectedIds,
  onChange,
}: {
  heading: string;
  addLabel: string;
  options: PickerItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedItems = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id)),
    [options, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-[var(--spacing-2)]">
      <p className="text-sm font-medium text-foreground">{heading}</p>
      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Remove ${item.name}`}
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== item.id))
                }
              >
                <X className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
          />
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {filtered.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={(checked) =>
                    onChange(
                      toggleId(selectedIds, option.id, checked === true),
                    )
                  }
                />
                {option.name}
              </label>
            ))}
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches.</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
          >
            Done
          </Button>
        </div>
      ) : (
        <DrawerAddAction
          label={addLabel}
          onClick={() => setOpen(true)}
          disabled={options.length === 0}
        />
      )}
    </div>
  );
}
