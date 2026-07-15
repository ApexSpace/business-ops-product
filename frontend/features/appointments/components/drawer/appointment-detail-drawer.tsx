"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { DrawerFooterPrimaryAction } from "@/components/layout/drawer-footer-primary";
import { AcknowledgementGuardDialog } from "@/components/forms/acknowledgement-guard-dialog";
import {
  DrawerShell,
  DRAWER_SHELL_HEADER_ACTION_CLASS,
} from "@/components/layout/drawer-shell";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAppointment,
  getAppointmentActivity,
} from "@/features/appointments/api/appointments.api";
import { AppointmentStatusBar } from "@/features/appointments/components/drawer/appointment-status-actions";
import { useAppointmentNotifyMutation } from "@/features/appointments/hooks/use-appointment-notify-mutation";
import { useAppointmentStatusMutation } from "@/features/appointments/hooks/use-appointment-status-mutation";
import {
  APPOINTMENT_LIFECYCLE_STATUS_OPTIONS,
  CLOSED_SALE_EDIT_GUARD_COPY,
  getContactDisplayName,
  requiresClosedSaleEditAcknowledgement,
  type AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { getCheckout } from "@/features/sales/api/checkouts.api";
import {
  CheckoutDrawerPanel,
  getCheckoutDrawerSubtotal,
  type CheckoutDrawerStep,
  type CheckoutDrawerSubmitAction,
} from "@/features/sales/components/checkout-drawer-panel";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import {
  DRAWER_FORM_STACK_CLASS,
  DRAWER_SCROLL_CONTENT_INSET_CLASS,
  DRAWER_SCROLL_EDGE_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import {
  AppointmentBookingDetailsSummary,
  AppointmentClientBlock,
  AppointmentDateTimeBar,
  AppointmentServicesList,
  resolveAppointmentUpdatedBy,
} from "./appointment-drawer-sections";
import { AppointmentAttachedPhotos } from "./appointment-attached-photos";
import { useCalendarStaffPermissions } from "@/features/appointments/hooks/use-calendar-staff-permissions";

export type AppointmentDrawerView = "detail" | "checkout";

export interface AppointmentDetailDrawerProps {
  appointmentId: string | null;
  drawerView?: AppointmentDrawerView;
  checkoutId?: string | null;
  variant?: "panel" | "sheet";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEdit: () => void;
  onClose: () => void;
  onBackFromCheckout?: () => void;
  onCheckoutComplete?: () => void;
  onMessageClick: (contactId: string) => void;
  onCheckout: (appointmentId: string) => void;
  onOpenCheckoutView: (checkoutId: string) => void;
  onRebook?: (appointmentId: string) => void;
  onStatusChange?: (status: AppointmentStatus) => void;
  onCancel?: (appointmentId: string) => void;
  onDelete?: (appointmentId: string) => void;
}

export function AppointmentDetailDrawer({
  appointmentId,
  drawerView = "detail",
  checkoutId = null,
  variant = "panel",
  open = true,
  onOpenChange,
  onEdit,
  onClose,
  onBackFromCheckout,
  onCheckoutComplete,
  onMessageClick,
  onCheckout,
  onOpenCheckoutView,
  onRebook,
  onStatusChange,
  onCancel,
  onDelete,
}: AppointmentDetailDrawerProps) {
  const { data: business } = useCurrentBusiness();
  const calendarPerms = useCalendarStaffPermissions();
  const statusMutation = useAppointmentStatusMutation(appointmentId);
  const notifyMutation = useAppointmentNotifyMutation(appointmentId);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutDrawerStep>("items");
  const [paymentAction, setPaymentAction] =
    useState<CheckoutDrawerSubmitAction | null>(null);
  const [closedSaleEditGuardOpen, setClosedSaleEditGuardOpen] = useState(false);

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: appointment, isLoading } = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId ?? ""),
    queryFn: () => getAppointment(appointmentId!),
    enabled: Boolean(appointmentId),
  });

  const { data: checkout } = useQuery({
    queryKey: queryKeys.checkouts.detail(checkoutId ?? ""),
    queryFn: () => getCheckout(checkoutId!),
    enabled: Boolean(checkoutId) && drawerView === "checkout",
  });

  const { data: updatedBy } = useQuery({
    queryKey: ["appointments", "detail", appointmentId, "activity"],
    queryFn: () => getAppointmentActivity(appointmentId!),
    enabled:
      Boolean(appointmentId) &&
      drawerView === "detail" &&
      calendarPerms.canViewHistory,
    select: (data) => resolveAppointmentUpdatedBy(data.items),
  });

  const timezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        appointment?.calendarId,
        calendars?.items,
      ),
    [business?.timezone, appointment?.calendarId, calendars?.items],
  );

  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";

  const handleStatusChange = (status: AppointmentStatus) => {
    statusMutation.mutate(status, {
      onSuccess: () => onStatusChange?.(status),
    });
  };

  const handleEditClick = () => {
    if (
      appointment &&
      requiresClosedSaleEditAcknowledgement(appointment)
    ) {
      setClosedSaleEditGuardOpen(true);
      return;
    }
    onEdit();
  };

  const closedSaleGuardDescription = useMemo(
    () => (
      <>
        {CLOSED_SALE_EDIT_GUARD_COPY.descriptionParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </>
    ),
    [],
  );

  if (!appointmentId) return null;

  const showCheckout = drawerView === "checkout" && Boolean(checkoutId);
  const title =
    showCheckout && checkoutStep === "payment" ? "Payment" : showCheckout ? "Checkout" : "Appointment";

  const canMutateThisAppointment = appointment
    ? calendarPerms.canManageAppointmentOnStaff(appointment.assignedToId)
    : false;
  const canChangeThisStatus =
    calendarPerms.canChangeStatus &&
    (appointment
      ? calendarPerms.isAdmin ||
        appointment.assignedToId === calendarPerms.userId ||
        calendarPerms.canViewOthers
      : false);
  const allowCancel = Boolean(onCancel) && canMutateThisAppointment;
  const allowDelete = Boolean(onDelete) && canMutateThisAppointment;
  const allowEdit = canMutateThisAppointment;
  const allowStatusMenu = canChangeThisStatus;

  const contactHeader = appointment?.contact
    ? {
        name: getContactDisplayName(appointment.contact),
        sinceLabel: appointment.contact.createdAt
          ? `Client since ${new Date(appointment.contact.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
          : null,
      }
    : null;

  const handleCheckoutBack = () => {
    if (checkoutStep === "payment") {
      setCheckoutStep("items");
      setPaymentAction(null);
      return;
    }
    setCheckoutStep("items");
    setPaymentAction(null);
    onBackFromCheckout?.();
  };

  const drawerFooter =
    showCheckout && checkout?.isOpen
      ? checkoutStep === "items"
        ? (
            <DrawerFooterPrimaryAction
              label="Go to payments"
              summaryLabel="Subtotal"
              summaryValue={getCheckoutDrawerSubtotal(checkout)}
              onClick={() => setCheckoutStep("payment")}
            />
          )
        : paymentAction
          ? (
              <DrawerFooterPrimaryAction
                label={paymentAction.label}
                disabled={paymentAction.disabled}
                onClick={paymentAction.onClick}
              />
            )
          : null
      : undefined;

  const detailHeaderActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton
              aria-label="Appointment actions"
              className={DRAWER_SHELL_HEADER_ACTION_CLASS}
            >
              <MoreHorizontal className="size-4" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          {allowStatusMenu
            ? APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.map((option) => {
                const isCurrent = appointment?.status === option.value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    disabled={isCurrent || statusMutation.isPending}
                    onClick={() => handleStatusChange(option.value)}
                  >
                    <span
                      className={cn(
                        "mr-2 size-2 rounded-full",
                        getAppointmentStatusDotClass(option.value),
                      )}
                    />
                    {option.label}
                  </DropdownMenuItem>
                );
              })
            : null}
          {allowStatusMenu ? <DropdownMenuSeparator /> : null}
          {onRebook && canMutateThisAppointment ? (
            <DropdownMenuItem onClick={() => onRebook(appointmentId)}>
              Rebook appointment
            </DropdownMenuItem>
          ) : null}
          {allowCancel && appointment?.status !== "CANCELLED" ? (
            <DropdownMenuItem
              onClick={() => onCancel?.(appointmentId)}
              className="text-destructive focus:text-destructive"
            >
              Cancel appointment
            </DropdownMenuItem>
          ) : null}
          {allowDelete ? (
            <DropdownMenuItem
              onClick={() => onDelete?.(appointmentId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {allowEdit ? (
        <IconButton
          aria-label="Edit appointment"
          onClick={handleEditClick}
          className={DRAWER_SHELL_HEADER_ACTION_CLASS}
        >
          <Pencil className="size-4" />
        </IconButton>
      ) : null}
      {variant === "panel" ? (
        <IconButton
          aria-label="Close appointment details"
          onClick={onClose}
          className={DRAWER_SHELL_HEADER_ACTION_CLASS}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </>
  );

  const checkoutHeaderActions = (
    <IconButton
      aria-label="Back"
      onClick={handleCheckoutBack}
      className={DRAWER_SHELL_HEADER_ACTION_CLASS}
    >
      <ChevronLeft className="size-4" />
    </IconButton>
  );

  return (
    <>
      <AcknowledgementGuardDialog
        open={closedSaleEditGuardOpen}
        onOpenChange={setClosedSaleEditGuardOpen}
        title={CLOSED_SALE_EDIT_GUARD_COPY.title}
        description={closedSaleGuardDescription}
        acknowledgementLabel={CLOSED_SALE_EDIT_GUARD_COPY.acknowledgementLabel}
        onConfirm={onEdit}
      />

      <DrawerShell
      variant={variant}
      width="compact"
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
          setCheckoutStep("items");
          setPaymentAction(null);
          onClose();
        }
      }}
      title={title}
      headerActions={showCheckout ? checkoutHeaderActions : detailHeaderActions}
      showCloseButton={variant === "sheet" && !showCheckout}
      footer={drawerFooter}
      contentClassName="flex min-h-0 flex-1 flex-col !py-5"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
    >
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col transition-all duration-300 ease-out",
            showCheckout
              ? "pointer-events-none -translate-x-4 opacity-0"
              : "translate-x-0 opacity-100",
          )}
        >
          {isLoading || !appointment ? (
            <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
              <div className={DRAWER_FORM_STACK_CLASS}>
                <AppointmentStatusBar
                  status={appointment.status}
                  relatedCheckoutId={appointment.relatedCheckoutId ?? null}
                  relatedCheckoutStatus={appointment.relatedCheckoutStatus ?? null}
                  waitingNotifiedAt={appointment.waitingNotifiedAt ?? null}
                  disabled={
                    !allowStatusMenu ||
                    statusMutation.isPending ||
                    notifyMutation.isPending
                  }
                  onStatusChange={handleStatusChange}
                  onNotify={() => {
                    if (canMutateThisAppointment) notifyMutation.mutate();
                  }}
                  onCheckout={() => onCheckout(appointment.id)}
                  onViewSale={() => {
                    if (appointment.relatedCheckoutId) {
                      onOpenCheckoutView(appointment.relatedCheckoutId);
                    }
                  }}
                />

                <AppointmentDateTimeBar
                  startAt={appointment.startAt}
                  endAt={appointment.endAt}
                  timezone={timezone}
                />

                <AppointmentClientBlock
                  contact={appointment.contact}
                  onMessageClick={
                    appointment.contactId
                      ? () => onMessageClick(appointment.contactId!)
                      : undefined
                  }
                />

                <AppointmentServicesList
                  services={appointment.services ?? []}
                  timezone={timezone}
                  currencyCode={currencyCode}
                />

                {appointment.notes?.trim() ? (
                  <div className="border-t border-border/60 pt-5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Notes
                    </p>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                      {appointment.notes}
                    </p>
                  </div>
                ) : null}

                <AppointmentAttachedPhotos
                  appointmentId={appointment.id}
                  hasPhotos={Boolean(
                    appointment.hasPhotos ||
                      (appointment.photoFileIds?.length ?? 0) > 0,
                  )}
                />

                {calendarPerms.canViewHistory ? (
                  <AppointmentBookingDetailsSummary
                    createdAt={appointment.createdAt}
                    updatedAt={appointment.updatedAt}
                    createdBy={appointment.createdBy}
                    updatedBy={updatedBy}
                    timezone={timezone}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col transition-all duration-300 ease-out",
            showCheckout
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0",
          )}
        >
          {checkoutId ? (
            <div className={DRAWER_SCROLL_EDGE_CLASS}>
              <div className={DRAWER_SCROLL_CONTENT_INSET_CLASS}>
                <CheckoutDrawerPanel
                  checkoutId={checkoutId}
                  step={checkoutStep}
                  contactHeader={contactHeader}
                  onSubmitActionChange={setPaymentAction}
                  onComplete={() => {
                    setCheckoutStep("items");
                    setPaymentAction(null);
                    onCheckoutComplete?.();
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DrawerShell>
    </>
  );
}
