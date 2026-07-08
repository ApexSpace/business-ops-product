"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  FolderTree,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityDetailSection } from "@/components/layout/entity-detail-section";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { SearchInput } from "@/components/forms/search-input";
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
import { FormSheet } from "@/components/forms/form-sheet";
import { FormSheetSection } from "@/components/forms/form-sheet-section";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_CLASS,
  DRAWER_SHEET_CONTENT_CLASS,
  DRAWER_SHEET_DESCRIPTION_CLASS,
  DRAWER_SHEET_HEADER_CLASS,
  DRAWER_SHEET_TITLE_CLASS,
} from "@/components/forms/drawer-sheet";
import {
  FINANCIAL_DRAWER_CONTENT_CLASS,
  FINANCIAL_DRAWER_DESCRIPTION_CLASS,
  FINANCIAL_DRAWER_FOOTER_CLASS,
  FINANCIAL_DRAWER_HEADER_CLASS,
  FINANCIAL_DRAWER_SHEET_CLASS,
  FINANCIAL_DRAWER_TITLE_CLASS,
} from "@/features/payments/components/financial-form-drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
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
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
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
  ProductDetail,
  ProductInventoryAdjustmentType,
  ProductListItem,
  ProductType,
} from "@/features/products/types";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";

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

type DrawerMode = "view" | "edit";

export function ProductsWorkspace() {
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["product"] });

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [editForm, setEditForm] = useState<ProductProfileFormValues>(
    productProfileDefaultValues,
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);

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
  const total = listData?.meta?.total ?? products.length;

  const openCreate = () => {
    setCreateOpen(true);
  };

  const startEdit = () => {
    if (!detail) return;
    setEditForm(productToProfileForm(detail));
    setDrawerMode("edit");
  };

  const cancelEdit = () => {
    setDrawerMode("view");
  };

  const saveEdit = () => {
    if (!selectedId || !editForm.name.trim()) return;
    mutations.update.mutate(
      { id: selectedId, body: profileFormToUpdateApiBody(editForm) },
      { onSuccess: () => setDrawerMode("view") },
    );
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
        cell: (row) => <span className="font-medium">{row.name}</span>,
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
    [],
  );

  const detailPanelProps = {
    productId: selectedId ?? "",
    detail,
    isLoading: detailLoading,
    onEdit: () => selectedId && startEdit(),
    onDelete: () => selectedId && setDeleteId(selectedId),
    onAdjust: (body: {
      variantId?: string;
      type: ProductInventoryAdjustmentType;
      quantityChange: number;
      note?: string;
    }) => {
      if (!selectedId) return;
      mutations.adjustInventory.mutate({ productId: selectedId, body });
    },
    adjustPending: mutations.adjustInventory.isPending,
  };

  return (
    <>
      <EntityWorkspaceLayout
        title="Products"
        description="Manage catalog products, pricing, and inventory."
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products…"
            className="min-w-0 flex-1"
          />
        }
        actions={
          <>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Options"
              onClick={() => setOptionsOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              className="sm:hidden"
              aria-label="Add product"
              onClick={openCreate}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              size="sm"
              className="hidden shrink-0 sm:inline-flex"
              onClick={openCreate}
            >
              <Plus className="mr-1.5 size-4" />
              Add product
            </Button>
          </>
        }
        footer={
          products.length > 0
            ? `${products.length} of ${total} product${total === 1 ? "" : "s"}`
            : undefined
        }
      >
        <DataTable
          columns={columns}
          data={products}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          density="compact"
          activeRowId={selectedId}
          onRowClick={(row) => {
            setDrawerMode("view");
            setSelectedId(row.id);
          }}
          getRowClassName={(row) =>
            selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
          }
          emptyTitle="No products yet"
          emptyDescription="Add your first product to get started."
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              Add product
            </Button>
          }
          className={WORKSPACE_TABLE_CLASS}
        />
      </EntityWorkspaceLayout>

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setDrawerMode("view");
          }
        }}
        title={
          drawerMode === "edit"
            ? "Update product"
            : detail?.name ?? "Product"
        }
        subtitle={
          drawerMode === "edit" ? undefined : detail?.categoryName ?? "Uncategorized"
        }
        isLoading={detailLoading}
        badges={
          drawerMode === "view" && detail ? (
            <>
              <Badge variant="neutral">{detail.productType}</Badge>
              <Badge
                variant={detail.status === "ACTIVE" ? "success" : "secondary"}
              >
                {detail.status}
              </Badge>
            </>
          ) : null
        }
        headerActions={
          selectedId && detail ? (
            drawerMode === "view" ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="mr-1 size-3.5" />
                Edit
              </Button>
            ) : null
          ) : null
        }
        overflowActions={
          drawerMode === "view" && selectedId
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="mr-2 size-4" />,
                  destructive: true,
                  onSelect: () => setDeleteId(selectedId),
                },
              ]
            : undefined
        }
        footer={
          drawerMode === "edit" ? (
            <EntityDetailFooter>
              <Button
                variant="outline"
                className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10rem]"
                disabled={mutations.update.isPending}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10rem]"
                disabled={
                  mutations.update.isPending || !editForm.name.trim()
                }
                onClick={saveEdit}
              >
                {mutations.update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </EntityDetailFooter>
          ) : null
        }
      >
        {selectedId && detail && drawerMode === "view" ? (
          <ProductDetailBody
            productId={selectedId}
            detail={detail}
            onAdjust={detailPanelProps.onAdjust}
            adjustPending={detailPanelProps.adjustPending}
          />
        ) : null}
        {selectedId && detail && drawerMode === "edit" ? (
          <div className="min-h-0 overflow-y-auto">
            <ProductProfileFormFields
              form={editForm}
              setForm={setEditForm}
              isEdit
              productId={selectedId}
              existing={detail}
              categories={categories}
              formActive
            />
          </div>
        ) : null}
      </EntityDetailDrawer>

      <ProductFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreate={(body) =>
          mutations.create.mutate(body, {
            onSuccess: (product) => {
              setCreateOpen(false);
              setSelectedId(product.id);
            },
          })
        }
        createPending={mutations.create.isPending}
      />

      <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex h-[100dvh] max-h-[100dvh] flex-col gap-0 p-0",
            DRAWER_SHEET_CLASS,
          )}
        >
          <SheetHeader className={DRAWER_SHEET_HEADER_CLASS}>
            <SheetTitle className={DRAWER_SHEET_TITLE_CLASS}>
              Product options
            </SheetTitle>
            <SheetDescription className={DRAWER_SHEET_DESCRIPTION_CLASS}>
              Manage categories and export your catalog.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 flex-1 overflow-y-auto !p-0">
            <div className={DRAWER_SHEET_CONTENT_CLASS}>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 px-4 py-3"
                onClick={() => {
                  setOptionsOpen(false);
                  setCategoriesOpen(true);
                }}
              >
                <FolderTree className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-left">
                  <span className="block font-medium">Manage categories</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Organize products into categories
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto w-full justify-start gap-3 px-4 py-3"
                disabled={mutations.exportCsv.isPending}
                onClick={() => mutations.exportCsv.mutate()}
              >
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-left">
                  <span className="block font-medium">Export products (CSV)</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Download the current product list
                  </span>
                </span>
              </Button>
              <p className="text-xs text-muted-foreground">
                Use column headers in the table to sort the current list.
              </p>
            </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex h-[100dvh] max-h-[100dvh] flex-col gap-0 p-0",
            DRAWER_SHEET_CLASS,
          )}
        >
          <SheetHeader className={DRAWER_SHEET_HEADER_CLASS}>
            <SheetTitle className={DRAWER_SHEET_TITLE_CLASS}>
              Product categories
            </SheetTitle>
            <SheetDescription className={DRAWER_SHEET_DESCRIPTION_CLASS}>
              Add, reorder, or remove product categories.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 flex-1 overflow-y-auto !p-0">
            <div className={DRAWER_SHEET_CONTENT_CLASS}>
            <div className="space-y-4">
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
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {categories.map((cat, index) => (
                  <li
                    key={cat.id}
                    className="flex items-center justify-between gap-2 bg-card px-3 py-2.5 text-sm"
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
            </div>
          </SheetBody>
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
                        clearSelection();
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
    </>
  );
}

function ProductDetailBody({
  productId,
  detail,
  onAdjust,
  adjustPending,
}: {
  productId: string;
  detail: NonNullable<ReturnType<typeof useProductDetail>["data"]>;
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

  const isVariable = detail.productType === "VARIABLE";
  const adjustmentHint =
    ADJUSTMENT_TYPES.find((t) => t.value === adjType)?.hint ?? "";

  return (
    <>
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/15 p-4 shadow-elevation-xs">
            <div className="space-y-1">
              <p className="text-drawer-section">Price</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatMoney(parseFloat(detail.unitPrice))}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-drawer-section">Stock</p>
              <p className="text-lg font-semibold tabular-nums">
                {detail.trackInventory ? detail.stockQuantity : "—"}
              </p>
            </div>
            {detail.brand ? (
              <div className="space-y-1">
                <p className="text-drawer-section">Brand</p>
                <p className="text-sm">{detail.brand}</p>
              </div>
            ) : null}
            {detail.sku ? (
              <div className="space-y-1">
                <p className="text-drawer-section">SKU</p>
                <p className="text-sm tabular-nums">{detail.sku}</p>
              </div>
            ) : null}
      </div>

      <ProductImagesPanel
        productId={productId}
        featuredImageKey={detail.featuredImageKey}
      />

      {isVariable ? (
        <div className="border-b border-border p-4">
          <ProductOptionsEditor productId={productId} options={detail.options} />
        </div>
      ) : null}

      {isVariable && detail.variants.length > 0 ? (
        <EntityDetailSection title="Variants" className="border-b border-border p-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                      <TableCell className="text-sm">{label}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {v.stockQuantity}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </EntityDetailSection>
      ) : null}

      {detail.trackInventory ? (
        <EntityDetailSection title="Inventory adjustment" className="border-b border-border p-4">
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
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
        </EntityDetailSection>
      ) : null}

      {detail.recentAdjustments.length > 0 ? (
        <EntityDetailSection title="Recent adjustments" className="p-4">
          <ul className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            {detail.recentAdjustments.slice(0, 8).map((adj) => (
              <li key={adj.id}>
                {formatAdjustmentSummary(adj)}
                {adj.variantKey ? ` · ${adj.variantKey}` : ""}
                {adj.note ? ` — ${adj.note}` : ""}
              </li>
            ))}
          </ul>
        </EntityDetailSection>
      ) : null}
    </>
  );
}

function ProductProfileFormFields({
  form,
  setForm,
  isEdit,
  productId,
  existing,
  categories,
  formActive,
}: {
  form: ProductProfileFormValues;
  setForm: (form: ProductProfileFormValues) => void;
  isEdit: boolean;
  productId?: string | null;
  existing?: ProductDetail | null;
  categories: Array<{ id: string; name: string }>;
  formActive: boolean;
}) {
  const isVariable = form.productType === "VARIABLE";
  const isBundle = form.productType === "BUNDLE";

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: queryKeys.business.members({ limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: formActive && form.assignStaffToSale,
  });

  const activeTeamMembers = useMemo(
    () =>
      (teamData?.items ?? []).filter((member) => member.status === "ACTIVE"),
    [teamData?.items],
  );

  return (
    <div className="space-y-4">
      <FormSheetSection title="Basic info" card>
        {!isEdit ? (
          <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={form.categoryId || "__none__"}
            onValueChange={(v) =>
              setForm({
                ...form,
                categoryId: !v || v === "__none__" ? "" : v,
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

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </FormSheetSection>

      <FormSheetSection title="Pricing & inventory" card>
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
      </FormSheetSection>

      <FormSheetSection title="Sales settings" card>
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
          onCheckedChange={(v) => setForm({ ...form, commissionEnabled: v })}
        />
        <ToggleRow
          label="Assign staff to sale"
          checked={form.assignStaffToSale}
          onCheckedChange={(v) => setForm({ ...form, assignStaffToSale: v })}
        />
        {form.assignStaffToSale ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              Staff are not assigned on this screen. When this product is added
              to a sale, you will choose who gets credit from your active team
              members:
            </p>
            {teamLoading ? (
              <p className="text-xs text-muted-foreground">Loading team…</p>
            ) : activeTeamMembers.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {activeTeamMembers.map((member) => {
                  const name =
                    [member.user.firstName, member.user.lastName]
                      .filter(Boolean)
                      .join(" ") || member.user.email;
                  return (
                    <li key={member.userId} className="text-foreground">
                      {name}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-warning">
                No active team members. Add staff under Settings → Team before
                selling this product.
              </p>
            )}
          </div>
        ) : null}
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
          onCheckedChange={(v) => setForm({ ...form, autoAddToNewSales: v })}
        />

        {isEdit && isVariable && existing && productId ? (
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
                        {v.price ? formatMoney(parseFloat(v.price)) : "—"}
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
            Bundle item configuration is available after the product is created.
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
      </FormSheetSection>
    </div>
  );
}

function ProductFormSheet({
  open,
  onOpenChange,
  categories,
  onCreate,
  createPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Array<{ id: string; name: string }>;
  onCreate: (body: Record<string, unknown>) => void;
  createPending: boolean;
}) {
  const [form, setForm] = useState<ProductProfileFormValues>(
    productProfileDefaultValues,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm(productProfileDefaultValues);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onCreate(profileFormToCreateApiBody(form));
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Add product"
      description="Create a new product for your catalog."
      className={FINANCIAL_DRAWER_SHEET_CLASS}
      headerClassName={FINANCIAL_DRAWER_HEADER_CLASS}
      titleClassName={FINANCIAL_DRAWER_TITLE_CLASS}
      descriptionClassName={FINANCIAL_DRAWER_DESCRIPTION_CLASS}
      bodyClassName={FINANCIAL_DRAWER_CONTENT_CLASS}
      footerClassName={FINANCIAL_DRAWER_FOOTER_CLASS}
      footer={
        <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
          <ActionButton
            type="button"
            disabled={createPending || !form.name.trim()}
            onClick={handleSubmit}
            className={DRAWER_FOOTER_BUTTON_CLASS}
          >
            Create product
          </ActionButton>
        </div>
      }
    >
      <ProductProfileFormFields
        form={form}
        setForm={setForm}
        isEdit={false}
        categories={categories}
        formActive={open}
      />
    </FormSheet>
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
