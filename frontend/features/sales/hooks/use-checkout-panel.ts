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
import { parseMembershipRedemptionSelection } from "@/features/sales/components/checkout-membership-field";
import type { CheckoutItem } from "@/features/sales/types/checkout";
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
  const [inlineAddMode, setInlineAddModeState] = useState<InlineAddMode>(null);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [changePriceItem, setChangePriceItem] = useState<CheckoutItem | null>(
    null,
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedMembershipKey, setSelectedMembershipKey] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState<string | null>(
    null,
  );
  const [productQty, setProductQty] = useState(1);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState(25);

  const { data: checkout, isLoading } = useQuery({
    queryKey: queryKeys.checkouts.detail(checkoutId),
    queryFn: () => getCheckout(checkoutId),
  });

  const canEdit = Boolean(checkout?.isOpen);
  const pickerEnabled = canEdit;

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

  const resetServiceSelection = useCallback(() => {
    setSelectedServiceId(null);
    setSelectedStaffId(null);
    setSelectedMembershipKey("");
  }, []);

  const resetProductSelection = useCallback(() => {
    setSelectedProductKey(null);
    setProductQty(1);
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

  const { data: staffData } = useQuery({
    queryKey: queryKeys.checkouts.serviceStaff(selectedServiceId ?? ""),
    queryFn: () => listCheckoutServiceStaff(selectedServiceId!),
    enabled: pickerEnabled && inlineAddMode === "service" && Boolean(selectedServiceId),
  });

  const staffOffersQuery = useQuery({
    queryKey: queryKeys.checkouts.staffOffers(),
    queryFn: listCheckoutStaffOffers,
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
    mutationFn: () => {
      const membership = parseMembershipRedemptionSelection(selectedMembershipKey);
      return addCheckoutService(checkoutId, {
        serviceId: selectedServiceId!,
        staffUserId: selectedStaffId ?? undefined,
        ...membership,
      });
    },
    onSuccess: (updatedCheckout) => {
      toast.success("Service added");
      closeInlineAdd();
      resetServiceSelection();
      expandLatestLine(updatedCheckout, setExpandedLineId);
      void invalidateCheckouts(queryClient, checkoutId);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectedProduct = useMemo(
    () =>
      (productsData?.items ?? []).find(
        (product) => pickerProductKey(product) === selectedProductKey,
      ) ?? null,
    [productsData?.items, selectedProductKey],
  );

  const addProductMutation = useMutation({
    mutationFn: () => {
      if (!selectedProduct) throw new Error("Select a product");
      return addCheckoutProduct(checkoutId, {
        productId: selectedProduct.productId,
        variantId: selectedProduct.variantId ?? undefined,
        quantity: productQty,
      });
    },
    onSuccess: (updatedCheckout) => {
      toast.success("Product added");
      closeInlineAdd();
      resetProductSelection();
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

  const staffItems = useMemo(
    () =>
      (staffData?.items ?? []).map((staff) => ({
        value: staff.id,
        label: staff.label,
      })),
    [staffData?.items],
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

  const toggleExpandedLine = useCallback((lineId: string) => {
    setExpandedLineId((current) => (current === lineId ? null : lineId));
  }, []);

  return {
    checkout,
    isLoading,
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
    selectedServiceId,
    setSelectedServiceId: (id: string | null) => {
      setSelectedServiceId(id);
      setSelectedStaffId(null);
      setSelectedMembershipKey("");
    },
    selectedStaffId,
    setSelectedStaffId,
    selectedMembershipKey,
    setSelectedMembershipKey,
    selectedProductKey,
    setSelectedProductKey,
    productQty,
    setProductQty,
    selectedOfferId,
    setSelectedOfferId,
    depositAmount,
    setDepositAmount,
    addServiceMutation,
    addProductMutation,
    depositMutation,
    giftCardMutation,
    packageMutation,
    applyOfferMutation,
    serviceItems,
    productItems,
    staffItems,
    expandedLineStaffItems,
    offerItems,
  };
}
