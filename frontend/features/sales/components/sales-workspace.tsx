"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
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
import { EmptyState } from "@/components/data-display/empty-state";
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

export function SalesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("sale");
  const contactFilter = searchParams.get("contact");
  const queryClient = useQueryClient();

  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [newContactId, setNewContactId] = useState<string | null>(
    contactFilter,
  );
  const [closeOpen, setCloseOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  const listFilters = useMemo(
    () => ({
      page: 1,
      limit: 50,
      search: listSearch.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      contactId: contactFilter ?? undefined,
    }),
    [listSearch, statusFilter, contactFilter],
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
    enabled: newSaleOpen || editOpen,
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
    setEditOpen(true);
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

  const selectSale = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sale", id);
      router.replace(`/business/sales?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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
      selectSale(created.id);
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
      setEditOpen(false);
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-[var(--page-padding-x)] pt-[var(--page-content-top-gap)]">
        <PageHeader
          title="Sales"
          description="Point-of-sale checkouts — open sales, add services, and collect payment."
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[var(--page-padding-x)] pb-[var(--page-padding-y)]">
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden max-lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
            <div className="shrink-0 space-y-2 border-b border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  className="min-w-0 flex-1"
                  placeholder="Search client or sale…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  className="size-[var(--control-height)] shrink-0 rounded-[var(--radius-control)]"
                  onClick={openNewSale}
                  aria-label="New sale"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <SearchableSelect
                items={statusFilterItems}
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                placeholder="Status"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : sales.length === 0 ? (
              <EmptyState
                icon={
                  <ShoppingBag
                    className="size-5 text-muted-foreground/70"
                    aria-hidden
                  />
                }
                title="No sales yet"
                description="Create a new sale to get started."
              />
            ) : (
              <ul className="space-y-1">
                {sales.map((row) => (
                  <SaleListItem
                    key={row.id}
                    sale={row}
                    selected={row.id === selectedId}
                    onSelect={() => selectSale(row.id)}
                  />
                ))}
              </ul>
            )}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs">
          {!selectedId ? (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
              <EmptyState
                icon={
                  <ShoppingBag
                    className="size-5 text-muted-foreground/70"
                    aria-hidden
                  />
                }
                title="Select a sale"
                description="Choose a sale from the list or create a new one."
              />
            </div>
          ) : detailLoading || !sale ? (
            <p className="p-6 text-sm text-muted-foreground">Loading sale…</p>
          ) : (
            <SaleDetail
              sale={sale}
              onAddService={() => setAddServiceOpen(true)}
              onAddProduct={() => setAddProductOpen(true)}
              onAddGiftCard={() => setAddGiftCardOpen(true)}
              onAddPackage={() => setAddPackageOpen(true)}
              onApplyOffer={() => setApplyOfferOpen(true)}
              onRemoveOffer={(offerId) => removeOfferMutation.mutate(offerId)}
              removeOfferPending={removeOfferMutation.isPending}
              onAddDeposit={(amount) => depositMutation.mutate(amount)}
              onClose={() => setCloseOpen(true)}
              onEdit={openEditSale}
              onVoid={() => setVoidOpen(true)}
              onEditLine={openEditLine}
              onRemoveLine={(lineId) => removeLineMutation.mutate(lineId)}
              lineRemovePending={removeLineMutation.isPending}
            />
          )}
        </div>
        </div>
      </div>

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <SearchableSelect
                inDialog
                items={contactItems}
                value={editContactId}
                onValueChange={setEditContactId}
                placeholder="Select client…"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!editContactId || updateSaleMutation.isPending}
              onClick={() => updateSaleMutation.mutate()}
            >
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingLine}
        onOpenChange={(open) => !open && setEditingLine(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit line</DialogTitle>
          </DialogHeader>
          {editingLine ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">{editingLine.title}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0.0001}
                    step="0.01"
                    value={lineQty || ""}
                    onChange={(e) =>
                      setLineQty(parseFloat(e.target.value) || 0)
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
                      setLineUnitPrice(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              {editingLine.serviceId && lineStaffItems.length > 0 ? (
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <SearchableSelect
                    inDialog
                    items={lineStaffItems}
                    value={lineStaffId}
                    onValueChange={setLineStaffId}
                    placeholder="Staff (optional)"
                  />
                </div>
              ) : null}
              <Button
                className="w-full"
                disabled={updateLineMutation.isPending || lineQty <= 0}
                onClick={() => updateLineMutation.mutate()}
              >
                Save line
              </Button>
            </div>
          ) : null}
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
    </div>
  );
}

function SaleListItem({
  sale,
  selected,
  onSelect,
}: {
  sale: Checkout;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
          selected ? "bg-accent" : "hover:bg-muted/60",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{sale.saleNumber}</span>
          <Badge
            variant={
              sale.status === "VOID"
                ? "destructive"
                : sale.isOpen
                  ? "default"
                  : "secondary"
            }
          >
            {sale.status === "VOID"
              ? "Void"
              : sale.isOpen
                ? "Open"
                : "Closed"}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {sale.contact?.label ?? "Client"} ·{" "}
          {formatMoney(parseFloat(sale.totalAmount))}
        </div>
      </button>
    </li>
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

function SaleDetailToolbar({
  onEdit,
  onAddDeposit,
  onAddService,
  onAddProduct,
  onAddGiftCard,
  onAddPackage,
  onApplyOffer,
  onVoid,
  onClose,
}: {
  onEdit: () => void;
  onAddDeposit: (amount: number) => void;
  onAddService: () => void;
  onAddProduct: () => void;
  onAddGiftCard: () => void;
  onAddPackage: () => void;
  onApplyOffer: () => void;
  onVoid: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2">
      <IconButton
        variant="outline"
        size="icon"
        className="size-[38px] shrink-0 rounded-[var(--radius-control)] shadow-elevation-xs"
        aria-label="Edit sale"
        onClick={onEdit}
      >
        <Pencil className="size-3.5" />
      </IconButton>
      <IconButton
        variant="outline"
        size="icon"
        className="size-[38px] shrink-0 rounded-[var(--radius-control)] shadow-elevation-xs"
        aria-label="Add wallet deposit"
        onClick={() => onAddDeposit(25)}
      >
        <CreditCard className="size-3.5" />
      </IconButton>

      <div className="mx-0.5 hidden h-[22px] w-px shrink-0 bg-border sm:block" aria-hidden />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-[var(--control-height)] gap-1.5 px-3 shadow-elevation-xs"
            >
              <Plus className="size-3.5" />
              Add to sale
              <ChevronDown className="size-2.5 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-[11.5rem]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Line items</DropdownMenuLabel>
            <DropdownMenuItem onClick={onAddService}>
              <Wrench className="size-3.5" />
              Service
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddProduct}>
              <Package className="size-3.5" />
              Product
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddGiftCard}>
              <Gift className="size-3.5" />
              Gift card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddPackage}>
              <ShoppingBag className="size-3.5" />
              Package
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onApplyOffer}>
            <Tag className="size-3.5" />
            Apply offer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton
              variant="outline"
              size="icon"
              className="size-[38px] shrink-0 rounded-[var(--radius-control)] shadow-elevation-xs"
              aria-label="More actions"
            >
              <MoreHorizontal className="size-4" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem variant="destructive" onClick={onVoid}>
            <Trash2 className="size-3.5" />
            Void sale
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        className="h-[var(--control-height)] gap-1.5 px-4"
        onClick={onClose}
      >
        Close &amp; collect
        <Check className="size-4" />
      </Button>
    </div>
  );
}

function SaleDetail({
  sale,
  onAddService,
  onAddProduct,
  onAddGiftCard,
  onAddPackage,
  onApplyOffer,
  onRemoveOffer,
  removeOfferPending,
  onAddDeposit,
  onClose,
  onEdit,
  onVoid,
  onEditLine,
  onRemoveLine,
  lineRemovePending,
}: {
  sale: Checkout;
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
}) {
  const statusLabel =
    sale.status === "VOID" ? "Void" : sale.isOpen ? "Open" : "Closed";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

        {sale.isOpen ? (
          <SaleDetailToolbar
            onEdit={onEdit}
            onAddDeposit={onAddDeposit}
            onAddService={onAddService}
            onAddProduct={onAddProduct}
            onAddGiftCard={onAddGiftCard}
            onAddPackage={onAddPackage}
            onApplyOffer={onApplyOffer}
            onVoid={onVoid}
            onClose={onClose}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{statusLabel}</span>
        )}
      </div>

      <div className="mt-5 border-t border-border">
        {sale.items.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No line items yet. Use{" "}
            <span className="font-medium text-foreground">Add to sale</span> to
            add a service, product, gift card, or package.
          </p>
        ) : (
          <ul>
            {sale.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.lineType.replaceAll("_", " ").toLowerCase()}
                    {item.staff ? ` · ${item.staff.label}` : ""}
                    {` · qty ${item.quantity}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(parseFloat(item.totalPrice))}
                  </span>
                  {sale.isOpen ? (
                    <div className="flex items-center gap-1.5">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="size-8 rounded-lg hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        disabled={lineRemovePending}
                        onClick={() => onRemoveLine(item.id)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
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
              {sale.isOpen ? (
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
