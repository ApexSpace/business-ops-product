"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney } from "@/features/payments/utils/currencies";
import {
  addCheckoutProduct,
  addCheckoutService,
  addGiftCardLine,
  addPackageLine,
  addWalletDepositLine,
  applyCheckoutOffer,
  getCheckout,
  listCheckoutProducts,
  listCheckoutServiceStaff,
  listCheckoutServices,
  listCheckoutStaffOffers,
  removeCheckoutLineItem,
  updateCheckoutLineItem,
} from "@/features/sales/api/checkouts.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import type { CheckoutItem } from "@/features/sales/types/checkout";
import { useSalesStaffPermissions } from "@/features/sales/hooks/use-sales-staff-permissions";
import {
  pickerProductKey,
  productPickerLabel,
} from "@/features/sales/utils/checkout-picker";
import { invalidateCheckouts } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

export type InlineAddMode =
  | "service"
  | "product"
  | "giftCard"
  | "package"
  | "offer"
  | "accountBalance"
  | null;

function expandLatestLine(
  checkout: { items: CheckoutItem[] },
  setExpandedLineId: (id: string | null) => void,
) {
  const lastItem = checkout.items[checkout.items.length - 1];
  if (lastItem) {
    setExpandedLineId(lastItem.id);
  }
}

export function useCheckoutPanel(checkoutId: string) {
  const queryClient = useQueryClient();
  const { canCheckout } = useSalesStaffPermissions();
  const [inlineAddMode, setInlineAddModeState] = useState<InlineAddMode>(null);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [changePriceItem, setChangePriceItem] = useState<CheckoutItem | null>(
    null,
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(25);
  const [pendingProductKey, setPendingProductKey] = useState<string | null>(null);
  const [productStaffId, setProductStaffId] = useState<string | null>(null);

  const {
    data: checkout,
    isLoading,
    error: checkoutError,
    isError: checkoutFailed,
  } = useQuery({
    queryKey: queryKeys.checkouts.detail(checkoutId),
    queryFn: () => getCheckout(checkoutId),
    retry: false,
  });

  const canEdit = Boolean(checkout?.isOpen) && canCheckout;
  const pickerEnabled = canEdit;
  const loadError = checkoutFailed
    ? checkoutError instanceof Error
      ? checkoutError.message
      : "Unable to load this checkout."
    : null;

  const refreshCheckout = useCallback(() => {
    void invalidateCheckouts(queryClient, checkoutId);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all(),
    });
  }, [checkoutId, queryClient]);

  const setInlineAddMode = useCallback((mode: InlineAddMode) => {
    setInlineAddModeState((current) => (current === mode ? null : mode));
  }, []);

  const closeInlineAdd = useCallback(() => {
    setInlineAddModeState(null);
  }, []);

  const { data: servicesData } = useQuery({
    queryKey: queryKeys.checkouts.services(),
    queryFn: listCheckoutServices,
    enabled: pickerEnabled,
  });

  const { data: productsData } = useQuery({
    queryKey: queryKeys.checkouts.products(),
    queryFn: () => listCheckoutProducts(),
    enabled: pickerEnabled,
  });

  const staffOffersQuery = useQuery({
    queryKey: queryKeys.checkouts.staffOffers(),
    queryFn: listCheckoutStaffOffers,
    enabled: pickerEnabled,
  });

  const businessMembersQuery = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: pickerEnabled,
  });

  const expandedLine = useMemo(
    () => checkout?.items.find((item) => item.id === expandedLineId) ?? null,
    [checkout?.items, expandedLineId],
  );

  const { data: expandedLineStaffData } = useQuery({
    queryKey: queryKeys.checkouts.serviceStaff(expandedLine?.serviceId ?? ""),
    queryFn: () => listCheckoutServiceStaff(expandedLine!.serviceId!),
    enabled: Boolean(expandedLine?.serviceId),
  });

  const addServiceMutation = useMutation({
    mutationFn: (serviceId: string) =>
      addCheckoutService(checkoutId, { serviceId }),
    onSuccess: (updatedCheckout) => {
      toast.success("Service added");
      closeInlineAdd();
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addProductMutation = useMutation({
    mutationFn: ({
      productKey,
      staffUserId,
    }: {
      productKey: string;
      staffUserId?: string;
    }) => {
      const product = (productsData?.items ?? []).find(
        (item) => pickerProductKey(item) === productKey,
      );
      if (!product) throw new Error("Select a product");
      const requiresStaff =
        checkout?.advancedSettings?.requireStaffForProducts ||
        product.assignStaffToSale;
      if (requiresStaff && !staffUserId) {
        throw new Error("Select a staff member for this product");
      }
      return addCheckoutProduct(checkoutId, {
        productId: product.productId,
        variantId: product.variantId ?? undefined,
        quantity: 1,
        staffUserId,
      });
    },
    onSuccess: (updatedCheckout) => {
      toast.success("Product added");
      closeInlineAdd();
      setPendingProductKey(null);
      setProductStaffId(null);
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const depositMutation = useMutation({
    mutationFn: () => addWalletDepositLine(checkoutId, { amount: depositAmount }),
    onSuccess: (updatedCheckout) => {
      toast.success("Account balance line added");
      closeInlineAdd();
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const giftCardMutation = useMutation({
    mutationFn: (body: {
      number?: string;
      amount: number;
      ownerContactId: string;
      sendDigital: boolean;
    }) => addGiftCardLine(checkoutId, body),
    onSuccess: (updatedCheckout) => {
      toast.success("Gift card added");
      closeInlineAdd();
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const packageMutation = useMutation({
    mutationFn: (body: {
      packageTemplateId: string;
      ownerContactId: string;
      isDemo: boolean;
    }) => addPackageLine(checkoutId, body),
    onSuccess: (updatedCheckout) => {
      toast.success("Package added");
      closeInlineAdd();
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const applyOfferMutation = useMutation({
    mutationFn: (offerId: string) => applyCheckoutOffer(checkoutId, offerId),
    onSuccess: () => {
      toast.success("Offer applied");
      closeInlineAdd();
      setSelectedOfferId(null);
      refreshCheckout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: string) => removeCheckoutLineItem(checkoutId, lineId),
    onSuccess: () => {
      toast.success("Item removed");
      if (expandedLineId) {
        setExpandedLineId(null);
      }
      refreshCheckout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateLineMutation = useMutation({
    mutationFn: ({
      lineId,
      body,
    }: {
      lineId: string;
      body: {
        quantity?: number;
        unitPrice?: number;
        staffUserId?: string | null;
      };
    }) => updateCheckoutLineItem(checkoutId, lineId, body),
    onSuccess: () => {
      refreshCheckout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const changePriceMutation = useMutation({
    mutationFn: ({
      lineId,
      unitPrice,
    }: {
      lineId: string;
      unitPrice: number;
    }) => updateCheckoutLineItem(checkoutId, lineId, { unitPrice }),
    onSuccess: () => {
      toast.success("Price updated");
      setChangePriceItem(null);
      refreshCheckout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const serviceItems = useMemo(
    () =>
      (servicesData?.items ?? []).map((service) => ({
        value: service.id,
        label: `${service.name} — ${formatMoney(parseFloat(service.price))}`,
      })),
    [servicesData?.items],
  );

  const productItems = useMemo(
    () =>
      (productsData?.items ?? []).map((product) => ({
        value: pickerProductKey(product),
        label: productPickerLabel(product),
      })),
    [productsData?.items],
  );

  const expandedLineStaffItems = useMemo(
    () =>
      (expandedLineStaffData?.items ?? []).map((staff) => ({
        value: staff.id,
        label: staff.label,
      })),
    [expandedLineStaffData?.items],
  );

  const offerItems = useMemo(
    () =>
      (staffOffersQuery.data ?? []).map((offer) => ({
        value: offer.id,
        label: offer.name,
      })),
    [staffOffersQuery.data],
  );

  const productStaffItems = useMemo(
    () =>
      (businessMembersQuery.data?.items ?? []).map((member) => ({
        value: member.userId,
        label:
          member.displayName ||
          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
          member.email ||
          member.userId,
      })),
    [businessMembersQuery.data?.items],
  );

  const handleAddProduct = useCallback(
    (productKey: string) => {
      const product = (productsData?.items ?? []).find(
        (item) => pickerProductKey(item) === productKey,
      );
      const requiresStaff =
        checkout?.advancedSettings?.requireStaffForProducts ||
        product?.assignStaffToSale;
      if (requiresStaff && !productStaffId) {
        setPendingProductKey(productKey);
        return;
      }
      addProductMutation.mutate({
        productKey,
        staffUserId: productStaffId ?? undefined,
      });
    },
    [
      addProductMutation,
      checkout?.advancedSettings?.requireStaffForProducts,
      productStaffId,
      productsData?.items,
    ],
  );

  const confirmPendingProduct = useCallback(() => {
    if (!pendingProductKey) return;
    addProductMutation.mutate({
      productKey: pendingProductKey,
      staffUserId: productStaffId ?? undefined,
    });
  }, [addProductMutation, pendingProductKey, productStaffId]);

  const toggleExpandedLine = useCallback((lineId: string) => {
    setExpandedLineId((current) => (current === lineId ? null : lineId));
  }, []);

  return {
    checkout,
    isLoading,
    loadError,
    canEdit,
    refreshCheckout,
    inlineAddMode,
    setInlineAddMode,
    closeInlineAdd,
    expandedLineId,
    toggleExpandedLine,
    changePriceItem,
    setChangePriceItem,
    removeLineMutation,
    updateLineMutation,
    changePriceMutation,
    selectedOfferId,
    setSelectedOfferId,
    depositAmount,
    setDepositAmount,
    pendingProductKey,
    setPendingProductKey,
    productStaffId,
    setProductStaffId,
    handleAddProduct,
    confirmPendingProduct,
    addServiceMutation,
    addProductMutation,
    depositMutation,
    giftCardMutation,
    packageMutation,
    applyOfferMutation,
    serviceItems,
    productItems,
    productStaffItems,
    expandedLineStaffItems,
    offerItems,
  };
}
