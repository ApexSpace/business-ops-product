"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-display/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import { useProductsList } from "@/features/products/hooks/use-products-list";
import { useProductDetail } from "@/features/products/hooks/use-product-detail";
import { useProductCategories } from "@/features/products/hooks/use-product-categories";
import { useProductMutations } from "@/features/products/hooks/use-product-mutations";
import { ProductOptionsEditor } from "@/features/products/components/product-options-editor";
import { ProductImagesPanel } from "@/features/products/components/product-images-panel";
import {
  productProfileDefaultValues,
  productToProfileForm,
  profileFormToCreateApiBody,
  profileFormToUpdateApiBody,
  type ProductProfileFormValues,
} from "@/features/products/schemas/product-profile";
import type {
  ProductInventoryAdjustmentType,
  ProductListItem,
  ProductType,
} from "@/features/products/types";

const ADJUSTMENT_TYPES: {
  value: ProductInventoryAdjustmentType;
  label: string;
  hint: string;
}[] = [
  {
    value: "RECEIVED",
    label: "Received",
    hint: "Add stock when inventory arrives from a supplier or shipment.",
  },
  {
    value: "RECOUNT",
    label: "Recount",
    hint: "Set stock to the exact count from a physical inventory check.",
  },
  {
    value: "PROFESSIONAL_USE",
    label: "Professional use",
    hint: "Remove stock used during appointments or internal professional use.",
  },
  {
    value: "OTHER",
    label: "Other",
    hint: "Manual correction. Use a positive or negative quantity as needed.",
  },
  {
    value: "RETURNED",
    label: "Customer return",
    hint: "Add stock back when a customer returns a product (e.g. after a sale).",
  },
];

function adjustmentQuantityLabel(type: ProductInventoryAdjustmentType): string {
  switch (type) {
    case "RECOUNT":
      return "New stock count";
    case "PROFESSIONAL_USE":
      return "Quantity used";
    case "RECEIVED":
    case "RETURNED":
      return "Quantity";
    default:
      return "Quantity change";
  }
}

function adjustmentQuantityMin(
  type: ProductInventoryAdjustmentType,
): number | undefined {
  if (type === "RECOUNT") return 0;
  if (
    type === "RECEIVED" ||
    type === "RETURNED" ||
    type === "PROFESSIONAL_USE"
  ) {
    return 1;
  }
  return undefined;
}

function formatAdjustmentSummary(adj: {
  type: ProductInventoryAdjustmentType;
  quantityChange: number;
}): string {
  switch (adj.type) {
    case "RECOUNT":
      return `Recount → ${adj.quantityChange}`;
    case "PROFESSIONAL_USE":
      return `Professional use −${Math.abs(adj.quantityChange)}`;
    case "RECEIVED":
      return `Received +${Math.abs(adj.quantityChange)}`;
    case "RETURNED":
      return `Customer return +${Math.abs(adj.quantityChange)}`;
    default:
      return `${adj.type} ${adj.quantityChange > 0 ? "+" : ""}${adj.quantityChange}`;
  }
}

export function ProductsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("product");

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const listFilters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: search.trim() || undefined,
    }),
    [search],
  );

  const { data: listData, isLoading } = useProductsList(listFilters);
  const { data: detail, isLoading: detailLoading } = useProductDetail(selectedId);
  const { data: categories = [] } = useProductCategories();
  const mutations = useProductMutations();

  const products = listData?.items ?? [];

  const selectProduct = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("product", id);
      router.replace(`/business/products?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const openCreate = () => {
    setEditingProductId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingProductId(id);
    setFormOpen(true);
  };

  const columns = useMemo<DataTableColumn<ProductListItem>[]>(
    () => [
      {
        id: "category",
        header: "Category",
        sortable: true,
        sortValue: (row) => row.categoryName ?? "",
        cell: (row) => row.categoryName ?? "—",
      },
      {
        id: "brand",
        header: "Brand",
        sortable: true,
        sortValue: (row) => row.brand ?? "",
        cell: (row) => row.brand ?? "—",
      },
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <button
            type="button"
            className="font-medium text-left hover:underline"
            onClick={() => selectProduct(row.id)}
          >
            {row.name}
          </button>
        ),
      },
      {
        id: "price",
        header: "Price",
        sortable: true,
        sortValue: (row) => parseFloat(row.unitPrice),
        className: "whitespace-nowrap",
        cell: (row) => formatMoney(parseFloat(row.unitPrice)),
      },
      {
        id: "stock",
        header: "Stock",
        sortable: true,
        sortValue: (row) => row.stockQuantity,
        className: "whitespace-nowrap",
        cell: (row) =>
          row.trackInventory ? String(row.stockQuantity) : "—",
      },
    ],
    [selectProduct],
  );

  return (
    <PageContainer className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Products"
        description="Manage your product catalog, inventory, and variants."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add product
          </Button>
        }
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4",
          selectedId ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1",
        )}
      >
        <div className="flex min-h-0 flex-col gap-3">
          <DataTable
            columns={columns}
            data={products}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="No products yet"
            emptyDescription="Add your first product to get started."
            emptyAction={
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 size-4" />
                Add product
              </Button>
            }
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOptionsOpen(true)}
                >
                  <MoreHorizontal className="mr-1.5 size-4" />
                  Options
                </Button>
              </div>
            }
            rowActions={(row) => (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => selectProduct(row.id)}
                  aria-label="View product"
                >
                  <Package className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(row.id)}
                  aria-label="Edit product"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteId(row.id)}
                  aria-label="Delete product"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          />
        </div>

        {selectedId ? (
          <ProductDetailSidebar
            productId={selectedId}
            detail={detail}
            isLoading={detailLoading}
            onEdit={() => openEdit(selectedId)}
            onAdjust={(body) =>
              mutations.adjustInventory.mutate({
                productId: selectedId,
                body,
              })
            }
            adjustPending={mutations.adjustInventory.isPending}
          />
        ) : null}
      </div>

      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        productId={editingProductId}
        categories={categories}
        onCreate={(body) =>
          mutations.create.mutate(body, {
            onSuccess: (product) => {
              setFormOpen(false);
              selectProduct(product.id);
            },
          })
        }
        onUpdate={(id, body) =>
          mutations.update.mutate(
            { id, body },
            { onSuccess: () => setFormOpen(false) },
          )
        }
        createPending={mutations.create.isPending}
        updatePending={mutations.update.isPending}
      />

      <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Product options</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOptionsOpen(false);
                setCategoriesOpen(true);
              }}
            >
              Manage categories
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={mutations.exportCsv.isPending}
              onClick={() => mutations.exportCsv.mutate()}
            >
              Export products (CSV)
            </Button>
            <p className="text-xs text-muted-foreground">
              Use column headers in the table to sort the current list.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Product categories</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button
                disabled={
                  !newCategoryName.trim() || mutations.createCategory.isPending
                }
                onClick={() => {
                  mutations.createCategory.mutate(
                    { name: newCategoryName.trim() },
                    { onSuccess: () => setNewCategoryName("") },
                  );
                }}
              >
                Add
              </Button>
            </div>
            <ul className="divide-y rounded-lg border">
              {categories.map((cat, index) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span>{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0 || mutations.reorderCategories.isPending}
                      onClick={() => {
                        const ids = categories.map((c) => c.id);
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        mutations.reorderCategories.mutate(ids);
                      }}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        index === categories.length - 1 ||
                        mutations.reorderCategories.isPending
                      }
                      onClick={() => {
                        const ids = categories.map((c) => c.id);
                        [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                        mutations.reorderCategories.mutate(ids);
                      }}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(cat.id)}
                      aria-label="Delete category"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                const isCategory = categories.some((c) => c.id === deleteId);
                if (isCategory) {
                  mutations.removeCategory.mutate(deleteId, {
                    onSuccess: () => setDeleteId(null),
                  });
                } else {
                  mutations.remove.mutate(deleteId, {
                    onSuccess: () => {
                      setDeleteId(null);
                      if (selectedId === deleteId) {
                        const params = new URLSearchParams(
                          searchParams.toString(),
                        );
                        params.delete("product");
                        router.replace(
                          `/business/products?${params.toString()}`,
                          { scroll: false },
                        );
                      }
                    },
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function ProductDetailSidebar({
  productId,
  detail,
  isLoading,
  onEdit,
  onAdjust,
  adjustPending,
}: {
  productId: string;
  detail: ReturnType<typeof useProductDetail>["data"];
  isLoading: boolean;
  onEdit: () => void;
  onAdjust: (body: {
    variantId?: string;
    type: ProductInventoryAdjustmentType;
    quantityChange: number;
    note?: string;
  }) => void;
  adjustPending: boolean;
}) {
  const [adjType, setAdjType] =
    useState<ProductInventoryAdjustmentType>("RECEIVED");
  const [adjQty, setAdjQty] = useState("1");
  const [adjNote, setAdjNote] = useState("");
  const [adjVariantId, setAdjVariantId] = useState<string>("");

  useEffect(() => {
    setAdjVariantId("");
    setAdjQty("1");
    setAdjNote("");
    setAdjType("RECEIVED");
  }, [productId]);

  if (isLoading || !detail) {
    return (
      <aside className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Loading product…
      </aside>
    );
  }

  const isVariable = detail.productType === "VARIABLE";
  const adjustmentHint =
    ADJUSTMENT_TYPES.find((t) => t.value === adjType)?.hint ?? "";

  return (
    <aside className="flex min-h-0 flex-col rounded-lg border bg-card">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {detail.categoryName ?? "Uncategorized"}
            </p>
            <h2 className="text-lg font-semibold">{detail.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="secondary">{detail.productType}</Badge>
              <Badge variant="outline">{detail.status}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 size-3.5" />
            Edit
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Price</dt>
            <dd>{formatMoney(parseFloat(detail.unitPrice))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stock</dt>
            <dd>
              {detail.trackInventory ? detail.stockQuantity : "Not tracked"}
            </dd>
          </div>
          {detail.brand ? (
            <div>
              <dt className="text-muted-foreground">Brand</dt>
              <dd>{detail.brand}</dd>
            </div>
          ) : null}
          {detail.sku ? (
            <div>
              <dt className="text-muted-foreground">SKU</dt>
              <dd>{detail.sku}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <ProductImagesPanel
        productId={productId}
        featuredImageKey={detail.featuredImageKey}
      />

      {isVariable ? (
        <div className="border-b p-4">
          <ProductOptionsEditor productId={productId} options={detail.options} />
        </div>
      ) : null}

      {isVariable && detail.variants.length > 0 ? (
        <div className="border-b p-4">
          <p className="mb-2 text-sm font-medium">Variants</p>
          <div className="max-h-40 overflow-y-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.variants.map((v) => {
                  const label =
                    v.optionValues.map((ov) => ov.value).join(" / ") ||
                    v.variantKey;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{label}</TableCell>
                      <TableCell className="text-right text-xs">
                        {v.stockQuantity}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {detail.trackInventory ? (
        <div className="border-b p-4">
          <p className="mb-3 text-sm font-medium">Inventory adjustment</p>
          <div className="space-y-3">
            {isVariable ? (
              <div className="space-y-1">
                <Label>Variant</Label>
                <Select
                  value={adjVariantId}
                  onValueChange={(v) => {
                    if (!v) return;
                    setAdjVariantId(v);
                    if (adjType === "RECOUNT") {
                      const variantStock = detail.variants.find(
                        (variant) => variant.id === v,
                      )?.stockQuantity;
                      if (variantStock !== undefined) {
                        setAdjQty(String(variantStock));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {detail.variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.optionValues.map((ov) => ov.value).join(" / ") ||
                          v.variantKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={adjType}
                onValueChange={(v) => {
                  if (!v) return;
                  const nextType = v as ProductInventoryAdjustmentType;
                  setAdjType(nextType);
                  if (nextType === "RECOUNT") {
                    const variantStock = isVariable
                      ? detail.variants.find((variant) => variant.id === adjVariantId)
                          ?.stockQuantity
                      : undefined;
                    setAdjQty(String(variantStock ?? detail.stockQuantity));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {adjustmentHint ? (
                <p className="text-xs text-muted-foreground">{adjustmentHint}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>{adjustmentQuantityLabel(adjType)}</Label>
              <Input
                type="number"
                min={adjustmentQuantityMin(adjType)}
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={
                adjustPending ||
                !adjQty ||
                (isVariable && !adjVariantId)
              }
              onClick={() =>
                onAdjust({
                  variantId: isVariable ? adjVariantId : undefined,
                  type: adjType,
                  quantityChange: parseInt(adjQty, 10),
                  note: adjNote.trim() || undefined,
                })
              }
            >
              Apply adjustment
            </Button>
          </div>
        </div>
      ) : null}

      {detail.recentAdjustments.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-2 text-sm font-medium">Recent adjustments</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {detail.recentAdjustments.slice(0, 8).map((adj) => (
              <li key={adj.id}>
                {formatAdjustmentSummary(adj)}
                {adj.variantKey ? ` · ${adj.variantKey}` : ""}
                {adj.note ? ` — ${adj.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

function ProductFormSheet({
  open,
  onOpenChange,
  productId,
  categories,
  onCreate,
  onUpdate,
  createPending,
  updatePending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  categories: Array<{ id: string; name: string }>;
  onCreate: (body: Record<string, unknown>) => void;
  onUpdate: (id: string, body: Record<string, unknown>) => void;
  createPending: boolean;
  updatePending: boolean;
}) {
  const isEdit = !!productId;
  const { data: existing } = useProductDetail(productId);
  const [form, setForm] = useState<ProductProfileFormValues>(
    productProfileDefaultValues,
  );

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setForm(productToProfileForm(existing));
    } else if (!isEdit) {
      setForm(productProfileDefaultValues);
    }
  }, [open, isEdit, existing]);

  const isVariable = form.productType === "VARIABLE";
  const isBundle = form.productType === "BUNDLE";
  const pending = createPending || updatePending;

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (isEdit && productId) {
      onUpdate(productId, profileFormToUpdateApiBody(form));
    } else {
      onCreate(profileFormToCreateApiBody(form));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!isEdit ? (
            <div className="space-y-1">
              <Label>Product type</Label>
              <Select
                value={form.productType}
                onValueChange={(v) =>
                  v &&
                  setForm({
                    ...form,
                    productType: v as ProductType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLE">Simple</SelectItem>
                  <SelectItem value="VARIABLE">Variable</SelectItem>
                  <SelectItem value="BUNDLE">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Type: {form.productType}
            </p>
          )}

          <FormField
            label="Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />

          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={form.categoryId || "__none__"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  categoryId: v === "__none__" ? "" : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Brand"
              value={form.brand ?? ""}
              onChange={(v) => setForm({ ...form, brand: v })}
            />
            <FormField
              label="Unit price"
              value={form.unitPrice ?? ""}
              onChange={(v) => setForm({ ...form, unitPrice: v })}
              type="number"
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Supplier"
              value={form.supplier ?? ""}
              onChange={(v) => setForm({ ...form, supplier: v })}
            />
            <FormField
              label="Unit label"
              value={form.unitLabel ?? ""}
              onChange={(v) => setForm({ ...form, unitLabel: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Purchase cost"
              value={form.purchaseCost ?? ""}
              onChange={(v) => setForm({ ...form, purchaseCost: v })}
              type="number"
            />
            <FormField
              label="Desired quantity"
              value={form.desiredQuantity ?? ""}
              onChange={(v) => setForm({ ...form, desiredQuantity: v })}
              type="number"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="SKU"
              value={form.sku ?? ""}
              onChange={(v) => setForm({ ...form, sku: v })}
            />
            <FormField
              label="Barcode"
              value={form.barcode ?? ""}
              onChange={(v) => setForm({ ...form, barcode: v })}
            />
          </div>

          {!isEdit && form.productType === "SIMPLE" ? (
            <FormField
              label="Initial stock"
              value={form.stockQuantity ?? ""}
              onChange={(v) => setForm({ ...form, stockQuantity: v })}
              type="number"
            />
          ) : null}

          <ToggleRow
            label="Charge tax"
            checked={form.chargeTax}
            onCheckedChange={(v) => setForm({ ...form, chargeTax: v })}
          />
          <ToggleRow
            label="Track inventory"
            checked={form.trackInventory}
            onCheckedChange={(v) => setForm({ ...form, trackInventory: v })}
          />
          <ToggleRow
            label="Commission enabled"
            checked={form.commissionEnabled}
            onCheckedChange={(v) =>
              setForm({ ...form, commissionEnabled: v })
            }
          />
          <ToggleRow
            label="Assign staff to sale"
            checked={form.assignStaffToSale}
            onCheckedChange={(v) =>
              setForm({ ...form, assignStaffToSale: v })
            }
          />
          <ToggleRow
            label="Consider as sales revenue"
            checked={form.considerAsSalesRevenue}
            onCheckedChange={(v) =>
              setForm({ ...form, considerAsSalesRevenue: v })
            }
          />
          <ToggleRow
            label="Auto-add to new sales"
            checked={form.autoAddToNewSales}
            onCheckedChange={(v) =>
              setForm({ ...form, autoAddToNewSales: v })
            }
          />

          {isEdit && isVariable && existing ? (
            <div className="rounded-lg border p-3">
              <ProductOptionsEditor
                productId={existing.id}
                options={existing.options}
              />
              {existing.variants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existing.variants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs">
                          {v.optionValues.map((ov) => ov.value).join(" / ") ||
                            v.variantKey}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {v.price
                            ? formatMoney(parseFloat(v.price))
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {v.stockQuantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          ) : null}

          {isBundle ? (
            <p className="text-xs text-muted-foreground">
              Bundle item configuration is available after the product is
              created.
            </p>
          ) : null}

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                v &&
                setForm({
                  ...form,
                  status: v as ProductProfileFormValues["status"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={pending || !form.name.trim()}
            onClick={handleSubmit}
          >
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
