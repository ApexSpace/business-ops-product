"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <PageContainer className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Sales"
        description="Point-of-sale checkouts — open sales, add services, and collect payment."
        actions={
          <Button onClick={openNewSale}>
            <Plus className="mr-2 size-4" />
            New sale
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="space-y-2 border-b p-3">
            <p className="text-sm font-medium">Sales</p>
            <Input
              placeholder="Search client or sale…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
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

        <div className="flex min-h-0 flex-col rounded-lg border bg-card">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8">
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
    </PageContainer>
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
          <Badge variant={sale.isOpen ? "default" : "secondary"}>
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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">{sale.saleNumber}</h2>
          <p className="text-sm text-muted-foreground">
            {sale.contact?.label} ·{" "}
            {sale.status === "VOID"
              ? "Void"
              : sale.isOpen
                ? "Open"
                : "Closed"}
          </p>
          {sale.notes ? (
            <p className="mt-1 text-xs text-muted-foreground">{sale.notes}</p>
          ) : null}
        </div>
        {sale.isOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onAddService}>
              Add service
            </Button>
            <Button variant="outline" size="sm" onClick={onAddProduct}>
              Add product
            </Button>
            <Button variant="outline" size="sm" onClick={onAddGiftCard}>
              Add gift card
            </Button>
            <Button variant="outline" size="sm" onClick={onAddPackage}>
              Add package
            </Button>
            <Button variant="outline" size="sm" onClick={onApplyOffer}>
              Apply offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddDeposit(25)}
            >
              + $25 wallet deposit
            </Button>
            <Button variant="destructive" size="sm" onClick={onVoid}>
              Void
            </Button>
            <Button size="sm" onClick={onClose}>
              Close &amp; collect
            </Button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sale.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No line items yet. Add a service, product, gift card, package, or wallet deposit.
          </p>
        ) : (
          <ul className="divide-y">
            {sale.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.lineType.replaceAll("_", " ").toLowerCase()}
                    {item.staff ? ` · ${item.staff.label}` : ""}
                    {` · qty ${item.quantity}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatMoney(parseFloat(item.totalPrice))}</span>
                  {sale.isOpen ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEditLine(item)}
                        aria-label="Edit line"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={lineRemovePending}
                        onClick={() => onRemoveLine(item.id)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(parseFloat(sale.subtotal))}</span>
        </div>
        {(sale.appliedOffers ?? []).map((offer) => (
          <div
            key={offer.offerId}
            className="flex items-center justify-between text-emerald-700"
          >
            <span className="flex items-center gap-2">
              Offer: {offer.offerName}
              {sale.isOpen ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0 text-xs"
                  disabled={removeOfferPending}
                  onClick={() => onRemoveOffer(offer.offerId)}
                >
                  Remove
                </Button>
              ) : null}
            </span>
            <span>-{formatMoney(parseFloat(offer.totalDiscount))}</span>
          </div>
        ))}
        {parseFloat(sale.discountAmount) > 0 &&
        !(sale.appliedOffers?.length) ? (
          <div className="flex justify-between text-emerald-700">
            <span>Discount</span>
            <span>-{formatMoney(parseFloat(sale.discountAmount))}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatMoney(parseFloat(sale.totalAmount))}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Balance due</span>
          <span>{formatMoney(parseFloat(sale.balanceDue))}</span>
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
