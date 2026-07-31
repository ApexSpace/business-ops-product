"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSalesStaffPermissions } from "@/features/sales/hooks/use-sales-staff-permissions";
import {
  Check,
  CreditCard,
  Gift,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/data-display/data-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { SearchInput } from "@/components/forms/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateCheckouts } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  addCheckoutProduct,
  addCheckoutService,
  addGiftCardLine,
  addPackageLine,
  addWalletDepositLine,
  applyCheckoutOffer,
  createCheckout,
  getCheckout,
  listCheckoutProducts,
  listCheckoutServiceStaff,
  listCheckoutServices,
  listCheckoutStaffOffers,
  listCheckouts,
  removeCheckoutLineItem,
  removeCheckoutOffer,
  updateCheckout,
  updateCheckoutLineItem,
  voidCheckout,
} from "@/features/sales/api/checkouts.api";
import { SaleClosePanel } from "@/features/sales/components/sale-close-panel";
import {
  CheckoutMembershipField,
  parseMembershipRedemptionSelection,
} from "@/features/sales/components/checkout-membership-field";
import { GiftCardSaleDialog } from "@/features/sales/components/gift-card-sale-dialog";
import { PackageSaleDialog } from "@/features/sales/components/package-sale-dialog";
import type {
  Checkout,
  CheckoutItem,
  CheckoutProductPickerItem,
} from "@/features/sales/types/checkout";

type StatusFilter = "all" | "OPEN" | "PAID" | "VOID";

const PAGE_LIMIT = 25;

export function SalesWorkspace() {
  const searchParams = useSearchParams();
  const contactFilter = searchParams.get("contact");
  const queryClient = useQueryClient();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["sale"] });

  const [listSearch, setListSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [newContactId, setNewContactId] = useState<string | null>(
    contactFilter,
  );
  const [closeOpen, setCloseOpen] = useState(false);
  const [saleEditMode, setSaleEditMode] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addGiftCardOpen, setAddGiftCardOpen] = useState(false);
  const [addPackageOpen, setAddPackageOpen] = useState(false);
  const [applyOfferOpen, setApplyOfferOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [selectedProductKey, setSelectedProductKey] = useState<string | null>(
    null,
  );
  const [productQty, setProductQty] = useState(1);
  const [selectedProductStaffId, setSelectedProductStaffId] = useState<
    string | null
  >(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedMembershipKey, setSelectedMembershipKey] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<CheckoutItem | null>(null);
  const [lineQty, setLineQty] = useState(1);
  const [lineUnitPrice, setLineUnitPrice] = useState(0);
  const [lineStaffId, setLineStaffId] = useState<string | null>(null);
  const { canCheckout } = useSalesStaffPermissions();

  const listFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: listSearch.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      contactId: contactFilter ?? undefined,
    }),
    [page, listSearch, statusFilter, contactFilter],
  );

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.checkouts.list(listFilters),
    queryFn: () => listCheckouts(listFilters),
  });

  const { data: sale, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.checkouts.detail(selectedId ?? ""),
    queryFn: () => getCheckout(selectedId!),
    enabled: !!selectedId,
  });

  const { data: contactsData } = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: () => listContacts({ page: 1, limit: 100 }),
    enabled: newSaleOpen || saleEditMode,
  });

  const { data: servicesData } = useQuery({
    queryKey: queryKeys.checkouts.services(),
    queryFn: listCheckoutServices,
    enabled: addServiceOpen && !!selectedId,
  });

  const { data: productsData } = useQuery({
    queryKey: queryKeys.checkouts.products(),
    queryFn: () => listCheckoutProducts(),
    enabled: addProductOpen && !!selectedId,
  });

  const selectedProduct = useMemo(
    () =>
      (productsData?.items ?? []).find(
        (p) => pickerProductKey(p) === selectedProductKey,
      ) ?? null,
    [productsData?.items, selectedProductKey],
  );

  const { data: productStaffData } = useQuery({
    queryKey: queryKeys.business.members({ limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled:
      addProductOpen && !!selectedProduct?.assignStaffToSale && !!selectedId,
  });

  const { data: staffData } = useQuery({
    queryKey: queryKeys.checkouts.serviceStaff(selectedServiceId ?? ""),
    queryFn: () => listCheckoutServiceStaff(selectedServiceId!),
    enabled: addServiceOpen && !!selectedServiceId,
  });

  const { data: lineStaffData } = useQuery({
    queryKey: queryKeys.checkouts.serviceStaff(
      editingLine?.serviceId ?? "",
    ),
    queryFn: () => listCheckoutServiceStaff(editingLine!.serviceId!),
    enabled: !!editingLine?.serviceId,
  });

  const sales = listData?.items ?? [];

  const contactItems = useMemo(
    () =>
      (contactsData?.items ?? []).map((c) => ({
        value: c.id,
        label: c.label ?? c.displayName ?? "Contact",
      })),
    [contactsData?.items],
  );

  const serviceItems = useMemo(
    () =>
      (servicesData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.name} — ${formatMoney(parseFloat(s.price))}`,
      })),
    [servicesData?.items],
  );

  const productItems = useMemo(
    () =>
      (productsData?.items ?? []).map((p) => ({
        value: pickerProductKey(p),
        label: productPickerLabel(p),
      })),
    [productsData?.items],
  );

  const productStaffItems = useMemo(
    () =>
      (productStaffData?.items ?? []).map((member) => ({
        value: member.userId,
        label:
          [member.user.firstName, member.user.lastName]
            .filter(Boolean)
            .join(" ") ||
          member.user.email ||
          "Staff",
      })),
    [productStaffData?.items],
  );

  const staffItems = useMemo(
    () =>
      (staffData?.items ?? []).map((s) => ({
        value: s.id,
        label: s.label,
      })),
    [staffData?.items],
  );

  const lineStaffItems = useMemo(
    () =>
      (lineStaffData?.items ?? []).map((s) => ({
        value: s.id,
        label: s.label,
      })),
    [lineStaffData?.items],
  );

  const openEditSale = () => {
    if (!sale) return;
    setEditNotes(sale.notes ?? "");
    setEditContactId(sale.contactId);
    setSaleEditMode(true);
  };

  const cancelEditSale = () => {
    setSaleEditMode(false);
  };

  const openEditLine = (item: CheckoutItem) => {
    setLineQty(parseFloat(item.quantity));
    setLineUnitPrice(parseFloat(item.unitPrice));
    setLineStaffId(item.staffUserId ?? null);
    setEditingLine(item);
  };

  const openNewSale = () => {
    setNewContactId(contactFilter);
    setNewSaleOpen(true);
  };

  const refreshSale = useCallback(() => {
    void invalidateCheckouts(queryClient, selectedId ?? undefined);
  }, [queryClient, selectedId]);

  const createMutation = useMutation({
    mutationFn: () => createCheckout({ contactId: newContactId! }),
    onSuccess: (created) => {
      toast.success("Sale created");
      setNewSaleOpen(false);
      setNewContactId(contactFilter);
      void invalidateCheckouts(queryClient);
      setSelectedId(created.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addServiceMutation = useMutation({
    mutationFn: () => {
      const membership = parseMembershipRedemptionSelection(
        selectedMembershipKey,
      );
      return addCheckoutService(selectedId!, {
        serviceId: selectedServiceId!,
        staffUserId: selectedStaffId ?? undefined,
        ...membership,
      });
    },
    onSuccess: () => {
      toast.success("Service added");
      setAddServiceOpen(false);
      setSelectedServiceId(null);
      setSelectedStaffId(null);
      setSelectedMembershipKey("");
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addProductMutation = useMutation({
    mutationFn: () =>
      addCheckoutProduct(selectedId!, {
        productId: selectedProduct!.productId,
        variantId: selectedProduct!.variantId ?? undefined,
        quantity: productQty,
        staffUserId: selectedProductStaffId ?? undefined,
      }),
    onSuccess: () => {
      toast.success("Product added");
      setAddProductOpen(false);
      setSelectedProductKey(null);
      setSelectedProductStaffId(null);
      setProductQty(1);
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const depositMutation = useMutation({
    mutationFn: (amount: number) =>
      addWalletDepositLine(selectedId!, { amount }),
    onSuccess: () => {
      toast.success("Wallet deposit line added");
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const giftCardMutation = useMutation({
    mutationFn: (body: {
      number?: string;
      amount: number;
      ownerContactId: string;
      sendDigital: boolean;
    }) => addGiftCardLine(selectedId!, body),
    onSuccess: () => {
      toast.success("Gift card added to sale");
      setAddGiftCardOpen(false);
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const packageMutation = useMutation({
    mutationFn: (body: {
      packageTemplateId: string;
      ownerContactId: string;
      isDemo: boolean;
    }) => addPackageLine(selectedId!, body),
    onSuccess: () => {
      toast.success("Package added to sale");
      setAddPackageOpen(false);
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const staffOffersQuery = useQuery({
    queryKey: queryKeys.checkouts.staffOffers(),
    queryFn: listCheckoutStaffOffers,
    enabled: applyOfferOpen,
  });

  const applyOfferMutation = useMutation({
    mutationFn: (offerId: string) => applyCheckoutOffer(selectedId!, offerId),
    onSuccess: () => {
      toast.success("Offer applied");
      setApplyOfferOpen(false);
      setSelectedOfferId(null);
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeOfferMutation = useMutation({
    mutationFn: (offerId: string) => removeCheckoutOffer(selectedId!, offerId),
    onSuccess: () => {
      toast.success("Offer removed");
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSaleMutation = useMutation({
    mutationFn: () =>
      updateCheckout(selectedId!, {
        contactId: editContactId ?? undefined,
        notes: editNotes.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Sale updated");
      setSaleEditMode(false);
      refreshSale();
      void invalidateCheckouts(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const voidMutation = useMutation({
    mutationFn: () => voidCheckout(selectedId!),
    onSuccess: () => {
      toast.success("Sale voided");
      setVoidOpen(false);
      refreshSale();
      void invalidateCheckouts(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: string) =>
      removeCheckoutLineItem(selectedId!, lineId),
    onSuccess: () => {
      toast.success("Line removed");
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateLineMutation = useMutation({
    mutationFn: () =>
      updateCheckoutLineItem(selectedId!, editingLine!.id, {
        quantity: lineQty,
        unitPrice: lineUnitPrice,
        staffUserId: editingLine?.serviceId ? lineStaffId : undefined,
      }),
    onSuccess: () => {
      toast.success("Line updated");
      setEditingLine(null);
      refreshSale();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const balanceDue = sale ? parseFloat(sale.balanceDue) : 0;

  const statusFilterItems = [
    { value: "all", label: "All" },
    { value: "OPEN", label: "Open" },
    { value: "PAID", label: "Closed" },
    { value: "VOID", label: "Void" },
  ];

  const columns = useMemo<DataTableColumn<Checkout>[]>(
    () => [
      {
        id: "saleNumber",
        header: "Sale",
        sortable: true,
        sortValue: (row) => row.saleNumber,
        cell: (row) => <span className="font-medium">{row.saleNumber}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            variant={
              row.status === "VOID"
                ? "destructive"
                : row.isOpen
                  ? "default"
                  : "secondary"
            }
          >
            {row.status === "VOID"
              ? "Void"
              : row.isOpen
                ? "Open"
                : "Closed"}
          </Badge>
        ),
      },
      {
        id: "client",
        header: "Client",
        sortable: true,
        sortValue: (row) => row.contact?.label ?? "",
        cell: (row) => row.contact?.label ?? "Client",
      },
      {
        id: "total",
        header: "Total",
        sortable: true,
        sortValue: (row) => parseFloat(row.totalAmount),
        className: "text-right whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums">
            {formatMoney(parseFloat(row.totalAmount))}
          </span>
        ),
      },
    ],
    [],
  );

  const saleDetailProps = sale
    ? {
        sale,
        onAddService: () => setAddServiceOpen(true),
        onAddProduct: () => setAddProductOpen(true),
        onAddGiftCard: () => setAddGiftCardOpen(true),
        onAddPackage: () => setAddPackageOpen(true),
        onApplyOffer: () => setApplyOfferOpen(true),
        onRemoveOffer: (offerId: string) => removeOfferMutation.mutate(offerId),
        removeOfferPending: removeOfferMutation.isPending,
        onAddDeposit: (amount: number) => depositMutation.mutate(amount),
        onClose: () => setCloseOpen(true),
        onEdit: openEditSale,
        onVoid: () => setVoidOpen(true),
        onEditLine: openEditLine,
        onRemoveLine: (lineId: string) => removeLineMutation.mutate(lineId),
        lineRemovePending: removeLineMutation.isPending,
      }
    : null;

  return (
  <>
      <EntityWorkspaceLayout
        title="Sales"
        description="Point-of-sale checkouts — open sales, add services, and collect payment."
        search={
          <SearchInput
            value={listSearch}
            onChange={(value) => {
              setListSearch(value);
              setPage(1);
            }}
            placeholder="Search client or sale…"
            className="min-w-0 flex-1"
          />
        }
        filters={
          <SearchableSelect
            items={statusFilterItems}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
            placeholder="Status"
          />
        }
        actions={
          canCheckout ? (
            <>
              <Button
                type="button"
                size="icon-sm"
                className="sm:hidden"
                onClick={openNewSale}
                aria-label="New sale"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="hidden shrink-0 sm:inline-flex"
                onClick={openNewSale}
              >
                <Plus className="mr-1.5 size-4" />
                New sale
              </Button>
            </>
          ) : null
        }
        footer={
          listData?.meta && sales.length > 0 ? (
            <ListPagination
              meta={listData.meta}
              page={page}
              onPageChange={setPage}
              label="sales"
              compact
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={sales}
          getRowId={(row) => row.id}
          isLoading={listLoading}
          density="compact"
          activeRowId={selectedId}
          onRowClick={(row) => {
            setSaleEditMode(false);
            setEditingLine(null);
            setSelectedId(row.id);
          }}
          getRowClassName={(row) =>
            selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
          }
          emptyTitle="No sales yet"
          emptyDescription="Create a new sale to get started."
          emptyAction={
            canCheckout ? (
              <Button size="sm" onClick={openNewSale}>
                <Plus className="mr-1.5 size-4" />
                New sale
              </Button>
            ) : undefined
          }
          className={WORKSPACE_TABLE_CLASS}
        />
      </EntityWorkspaceLayout>

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setSaleEditMode(false);
            setEditingLine(null);
          }
        }}
        width="wide"
        title={
          saleEditMode ? "Edit sale" : sale?.saleNumber ?? "Sale"
        }
        subtitle={saleEditMode ? undefined : sale?.contact?.label}
        isLoading={detailLoading}
        badges={
          !saleEditMode && sale ? (
            <SaleStatusPill status={sale.status} isOpen={sale.isOpen} />
          ) : null
        }
        headerActions={
          sale?.isOpen && saleDetailProps && canCheckout && !saleEditMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={saleDetailProps.onEdit}
            >
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
          ) : null
        }
        overflowActions={
          sale?.isOpen && saleDetailProps && canCheckout && !saleEditMode
            ? [
                {
                  id: "void",
                  label: "Void sale",
                  icon: <Trash2 className="size-3.5" />,
                  destructive: true,
                  onSelect: saleDetailProps.onVoid,
                },
              ]
            : undefined
        }
        toolbar={
          sale?.isOpen && saleDetailProps && canCheckout && !saleEditMode ? (
            <SaleAddItemsToolbar
              onAddDeposit={saleDetailProps.onAddDeposit}
              onAddService={saleDetailProps.onAddService}
              onAddProduct={saleDetailProps.onAddProduct}
              onAddGiftCard={saleDetailProps.onAddGiftCard}
              onAddPackage={saleDetailProps.onAddPackage}
              onApplyOffer={saleDetailProps.onApplyOffer}
            />
          ) : null
        }
        footer={
          sale?.isOpen && saleDetailProps && canCheckout ? (
            saleEditMode ? (
              <EntityDetailFooter>
                <Button
                  variant="outline"
                  className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10rem]"
                  disabled={updateSaleMutation.isPending}
                  onClick={cancelEditSale}
                >
                  Cancel
                </Button>
                <Button
                  className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10rem]"
                  disabled={
                    !editContactId || updateSaleMutation.isPending
                  }
                  onClick={() => updateSaleMutation.mutate()}
                >
                  {updateSaleMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </EntityDetailFooter>
            ) : (
              <EntityDetailFooter>
                <Button
                  className="min-h-[2.75rem] flex-1 sm:flex-none sm:min-w-[12rem]"
                  onClick={saleDetailProps.onClose}
                >
                  Go to payments
                  <Check className="ml-1.5 size-4" />
                </Button>
              </EntityDetailFooter>
            )
          ) : null
        }
      >
        {selectedId && sale && saleDetailProps ? (
          <SaleDetail
            embedded
            {...saleDetailProps}
            canModify={canCheckout}
            saleEditMode={saleEditMode}
            editContactId={editContactId}
            editNotes={editNotes}
            contactItems={contactItems}
            onEditContactIdChange={setEditContactId}
            onEditNotesChange={setEditNotes}
            editingLine={editingLine}
            lineQty={lineQty}
            lineUnitPrice={lineUnitPrice}
            lineStaffId={lineStaffId}
            lineStaffItems={lineStaffItems}
            onLineQtyChange={setLineQty}
            onLineUnitPriceChange={setLineUnitPrice}
            onLineStaffIdChange={setLineStaffId}
            onCancelLineEdit={() => setEditingLine(null)}
            onSaveLineEdit={() => updateLineMutation.mutate()}
            lineSavePending={updateLineMutation.isPending}
          />
        ) : null}
      </EntityDetailDrawer>

      <Dialog open={newSaleOpen} onOpenChange={setNewSaleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SearchableSelect
              inDialog
              items={contactItems}
              value={newContactId}
              onValueChange={setNewContactId}
              placeholder="Select client…"
            />
            <Button
              className="w-full"
              disabled={!newContactId || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create open sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SearchableSelect
              inDialog
              items={productItems}
              value={selectedProductKey}
              onValueChange={(key) => {
                setSelectedProductKey(key);
                setSelectedProductStaffId(null);
              }}
              placeholder="Select product…"
            />
            {selectedProduct?.assignStaffToSale ? (
              <div className="space-y-2">
                <Label>Staff</Label>
                <SearchableSelect
                  inDialog
                  items={productStaffItems}
                  value={selectedProductStaffId}
                  onValueChange={setSelectedProductStaffId}
                  placeholder="Select staff…"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0.0001}
                step="1"
                value={productQty || ""}
                onChange={(e) =>
                  setProductQty(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <Button
              className="w-full"
              disabled={
                !selectedProductKey ||
                productQty <= 0 ||
                addProductMutation.isPending ||
                (selectedProduct?.assignStaffToSale && !selectedProductStaffId)
              }
              onClick={() => addProductMutation.mutate()}
            >
              Add to sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addServiceOpen}
        onOpenChange={(open) => {
          setAddServiceOpen(open);
          if (!open) {
            setSelectedServiceId(null);
            setSelectedStaffId(null);
            setSelectedMembershipKey("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SearchableSelect
              inDialog
              items={serviceItems}
              value={selectedServiceId}
              onValueChange={(id) => {
                setSelectedServiceId(id);
                setSelectedStaffId(null);
                setSelectedMembershipKey("");
              }}
              placeholder="Select service…"
            />
            {selectedServiceId && staffItems.length > 0 ? (
              <SearchableSelect
                inDialog
                items={staffItems}
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
                placeholder="Staff (optional)"
              />
            ) : null}
            <CheckoutMembershipField
              contactId={sale?.contactId ?? null}
              serviceId={selectedServiceId}
              value={selectedMembershipKey}
              onValueChange={setSelectedMembershipKey}
            />
            <Button
              className="w-full"
              disabled={!selectedServiceId || addServiceMutation.isPending}
              onClick={() => addServiceMutation.mutate()}
            >
              Add to sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GiftCardSaleDialog
        open={addGiftCardOpen}
        onOpenChange={setAddGiftCardOpen}
        defaultOwnerContactId={sale?.contactId ?? null}
        onSubmit={(values) => giftCardMutation.mutate(values)}
        isPending={giftCardMutation.isPending}
      />

      <PackageSaleDialog
        open={addPackageOpen}
        onOpenChange={setAddPackageOpen}
        defaultOwnerContactId={sale?.contactId ?? null}
        onSubmit={(values) => packageMutation.mutate(values)}
        isPending={packageMutation.isPending}
      />

      <Dialog open={applyOfferOpen} onOpenChange={setApplyOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SearchableSelect
              inDialog
              items={(staffOffersQuery.data ?? []).map((offer) => ({
                value: offer.id,
                label: offer.name,
              }))}
              value={selectedOfferId}
              onValueChange={setSelectedOfferId}
              placeholder="Select a staff offer…"
            />
            <Button
              className="w-full"
              disabled={!selectedOfferId || applyOfferMutation.isPending}
              onClick={() =>
                selectedOfferId && applyOfferMutation.mutate(selectedOfferId)
              }
            >
              Apply offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Close sale — collect payment</DialogTitle>
          </DialogHeader>
          {sale && sale.isOpen ? (
            <SaleClosePanel
              checkoutId={sale.id}
              contactId={sale.contactId}
              balanceDue={balanceDue}
              onComplete={() => {
                setCloseOpen(false);
                refreshSale();
                void invalidateCheckouts(queryClient);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This open sale will be voided and cannot be collected. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => voidMutation.mutate()}
              disabled={voidMutation.isPending}
            >
              Void sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SaleStatusPill({
  status,
  isOpen,
}: {
  status: Checkout["status"];
  isOpen: boolean;
}) {
  if (status === "VOID") {
    return <Badge variant="destructive">Void</Badge>;
  }
  if (isOpen) {
    return <Badge>Open</Badge>;
  }
  return <Badge variant="secondary">Closed</Badge>;
}

function SaleAddItemsToolbar({
  onAddDeposit,
  onAddService,
  onAddProduct,
  onAddGiftCard,
  onAddPackage,
  onApplyOffer,
}: {
  onAddDeposit: (amount: number) => void;
  onAddService: () => void;
  onAddProduct: () => void;
  onAddGiftCard: () => void;
  onAddPackage: () => void;
  onApplyOffer: () => void;
}) {
  const actions = [
    { id: "service", label: "Service", icon: Wrench, onClick: onAddService },
    { id: "product", label: "Product", icon: Package, onClick: onAddProduct },
    {
      id: "gift-card",
      label: "Gift card",
      icon: Gift,
      onClick: onAddGiftCard,
    },
    {
      id: "package",
      label: "Package",
      icon: ShoppingBag,
      onClick: onAddPackage,
    },
    { id: "offer", label: "Offer", icon: Tag, onClick: onApplyOffer },
    {
      id: "deposit",
      label: "Deposit",
      icon: CreditCard,
      onClick: () => onAddDeposit(25),
    },
  ] as const;

  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Add to sale</p>
      <div className="grid grid-cols-3 gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            className="h-auto min-h-[3.25rem] flex-col gap-1 rounded-lg px-2 py-2 text-[11px] font-medium leading-tight shadow-elevation-xs"
            onClick={action.onClick}
          >
            <action.icon className="size-4 shrink-0 text-muted-foreground" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SaleDetail({
  sale,
  embedded = false,
  canModify = true,
  onApplyOffer,
  onRemoveOffer,
  removeOfferPending,
  onEditLine,
  onRemoveLine,
  lineRemovePending,
  saleEditMode = false,
  editContactId = null,
  editNotes = "",
  contactItems = [],
  onEditContactIdChange = () => {},
  onEditNotesChange,
  editingLine = null,
  lineQty = 1,
  lineUnitPrice = 0,
  lineStaffId = null,
  lineStaffItems = [],
  onLineQtyChange,
  onLineUnitPriceChange,
  onLineStaffIdChange = () => {},
  onCancelLineEdit,
  onSaveLineEdit,
  lineSavePending = false,
}: {
  sale: Checkout;
  embedded?: boolean;
  canModify?: boolean;
  onAddService: () => void;
  onAddProduct: () => void;
  onAddGiftCard: () => void;
  onAddPackage: () => void;
  onApplyOffer: () => void;
  onRemoveOffer: (offerId: string) => void;
  removeOfferPending: boolean;
  onAddDeposit: (amount: number) => void;
  onClose: () => void;
  onEdit: () => void;
  onVoid: () => void;
  onEditLine: (item: CheckoutItem) => void;
  onRemoveLine: (lineId: string) => void;
  lineRemovePending: boolean;
  saleEditMode?: boolean;
  editContactId?: string | null;
  editNotes?: string;
  contactItems?: Array<{ value: string; label: string }>;
  onEditContactIdChange?: (id: string | null) => void;
  onEditNotesChange?: (notes: string) => void;
  editingLine?: CheckoutItem | null;
  lineQty?: number;
  lineUnitPrice?: number;
  lineStaffId?: string | null;
  lineStaffItems?: Array<{ value: string; label: string }>;
  onLineQtyChange?: (qty: number) => void;
  onLineUnitPriceChange?: (price: number) => void;
  onLineStaffIdChange?: (id: string | null) => void;
  onCancelLineEdit?: () => void;
  onSaveLineEdit?: () => void;
  lineSavePending?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !embedded && "overflow-y-auto px-4 py-3",
      )}
    >
      {!embedded ? (
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{sale.saleNumber}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{sale.contact?.label}</span>
            <SaleStatusPill status={sale.status} isOpen={sale.isOpen} />
          </div>
          {sale.notes ? (
            <p className="mt-2 text-xs text-muted-foreground">{sale.notes}</p>
          ) : null}
        </div>
      ) : saleEditMode ? (
        <div className="space-y-4 border-b border-border pb-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <SearchableSelect
              items={contactItems}
              value={editContactId}
              onValueChange={onEditContactIdChange}
              placeholder="Select client…"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={editNotes}
              onChange={(e) => onEditNotesChange?.(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      ) : sale.notes ? (
        <p className="text-xs text-muted-foreground">{sale.notes}</p>
      ) : null}

      <div className={cn(!embedded && !saleEditMode && "mt-5", "border-t border-border")}>
        {sale.items.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No line items yet. Use the buttons above to add a service,
            product, gift card, package, or offer.
          </p>
        ) : (
          <ul>
            {sale.items.map((item) => {
              const isLineEditing = editingLine?.id === item.id;
              return (
              <li
                key={item.id}
                className="border-b border-border py-4 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  {!isLineEditing ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.lineType.replaceAll("_", " ").toLowerCase()}
                    {item.staff ? ` · ${item.staff.label}` : ""}
                    {` · qty ${item.quantity}`}
                  </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {!isLineEditing ? (
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(parseFloat(item.totalPrice))}
                  </span>
                  ) : null}
                  {sale.isOpen && !saleEditMode && canModify ? (
                    <div className="flex items-center gap-1.5">
                      {!isLineEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="size-8 rounded-lg"
                        onClick={() => onEditLine(item)}
                        aria-label="Edit line"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="size-8 rounded-lg hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        disabled={lineRemovePending || isLineEditing}
                        onClick={() => onRemoveLine(item.id)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                </div>
                {isLineEditing ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min={0.0001}
                          step="0.01"
                          value={lineQty || ""}
                          onChange={(e) =>
                            onLineQtyChange?.(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={lineUnitPrice || ""}
                          onChange={(e) =>
                            onLineUnitPriceChange?.(
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>
                    {item.serviceId && lineStaffItems.length > 0 ? (
                      <div className="space-y-2">
                        <Label>Staff</Label>
                        <SearchableSelect
                          items={lineStaffItems}
                          value={lineStaffId}
                          onValueChange={onLineStaffIdChange}
                          placeholder="Staff (optional)"
                        />
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancelLineEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={lineSavePending || lineQty <= 0}
                        onClick={onSaveLineEdit}
                      >
                        {lineSavePending ? "Saving…" : "Save line"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-1 border-t border-border bg-muted/20 px-0.5 pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">
            {formatMoney(parseFloat(sale.subtotal))}
          </span>
        </div>
        {(sale.appliedOffers ?? []).map((offer) => (
          <div
            key={offer.offerId}
            className="flex items-center justify-between gap-4 text-emerald-700"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">Offer: {offer.offerName}</span>
              {sale.isOpen && canModify ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto shrink-0 px-1 py-0 text-xs"
                  disabled={removeOfferPending}
                  onClick={() => onRemoveOffer(offer.offerId)}
                >
                  Remove
                </Button>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums">
              -{formatMoney(parseFloat(offer.totalDiscount))}
            </span>
          </div>
        ))}
        {parseFloat(sale.discountAmount) > 0 &&
        !(sale.appliedOffers?.length) ? (
          <div className="flex justify-between gap-4 text-emerald-700">
            <span>Discount</span>
            <span className="tabular-nums">
              -{formatMoney(parseFloat(sale.discountAmount))}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-border/60 pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(parseFloat(sale.totalAmount))}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span>Balance due</span>
          <span className="tabular-nums">
            {formatMoney(parseFloat(sale.balanceDue))}
          </span>
        </div>
      </div>
    </div>
  );
}

function pickerProductKey(item: CheckoutProductPickerItem) {
  return item.variantId
    ? `${item.productId}:${item.variantId}`
    : item.productId;
}

function productPickerLabel(item: CheckoutProductPickerItem) {
  const name = item.variantLabel
    ? `${item.name} — ${item.variantLabel}`
    : item.name;
  return `${name} — ${formatMoney(parseFloat(item.unitPrice))}`;
}
