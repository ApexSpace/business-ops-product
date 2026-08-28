"use client";

import { useIsMobile } from "@/lib/hooks/use-mobile";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import {
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DrawerFooterPrimaryAction } from "@/components/layout/drawer-footer-primary";
import { AcknowledgementGuardDialog } from "@/components/forms/acknowledgement-guard-dialog";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { IconButton } from "@/components/ui/icon-button";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
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
  resendExpressAppointment,
  staffCompleteExpressAppointment,
} from "@/features/appointments/api/appointments.api";
import { DrawerCloseIcon } from "@/components/drawer/drawer-icons";
import { DrawerFooterContent } from "@/components/drawer/drawer-footer-content";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { AppointmentStatusBar } from "@/features/appointments/components/drawer/appointment-status-actions";
import {
  AppointmentUpdateForm,
  type AppointmentUpdateFormHandle,
} from "@/features/appointments/components/drawer/appointment-edit-drawer";
import { AppointmentDateTimeDisplay } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import {
  AppointmentClientCard,
  AppointmentGuestCard,
} from "@/features/appointments/components/drawer/appointment-client-card";
import {
  AppointmentAddActions,
  AppointmentServiceCard,
} from "@/features/appointments/components/drawer/appointment-service-card";
import { AppointmentBookingDetails } from "@/features/appointments/components/drawer/appointment-booking-details";
import { useAppointmentNotifyMutation } from "@/features/appointments/hooks/use-appointment-notify-mutation";
import { useAppointmentStatusMutation } from "@/features/appointments/hooks/use-appointment-status-mutation";
import {
  APPOINTMENT_LIFECYCLE_STATUS_OPTIONS,
  CLOSED_SALE_EDIT_GUARD_COPY,
  getContactDisplayName,
  isAppointmentTimeBlock,
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
import {
  formatTimeInTimezone,
  resolveAppointmentDisplayTimezone,
} from "@/features/calendars/utils/timezone";
import {
  DRAWER_SCROLL_CONTENT_INSET_CLASS,
  DRAWER_SCROLL_EDGE_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import {
  APPOINTMENT_DRAWER_BODY_INSET_CLASS,
  APPOINTMENT_DRAWER_FOOTER_CLASS,
  APPOINTMENT_DRAWER_SHELL_CLASS,
  APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS,
  APPOINTMENT_DRAWER_SHELL_HEADER_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { resolveAppointmentUpdatedBy } from "./appointment-drawer-sections";
import { AppointmentAttachedPhotos } from "./appointment-attached-photos";
import { TimeBlockDetailView } from "./time-block-detail-view";
import {
  TimeBlockUpdateForm,
  type TimeBlockUpdateFormHandle,
} from "./time-block-update-form";
import { useCalendarStaffPermissions } from "@/features/appointments/hooks/use-calendar-staff-permissions";

export type AppointmentDrawerView = "detail" | "checkout";

export interface AppointmentDetailDrawerProps {
  appointmentId: string | null;
  drawerView?: AppointmentDrawerView;
  checkoutId?: string | null;
  variant?: "panel" | "sheet";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();
  const calendarPerms = useCalendarStaffPermissions();
  const statusMutation = useAppointmentStatusMutation(appointmentId);
  const notifyMutation = useAppointmentNotifyMutation(appointmentId);
  const invalidateAppointmentQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all(),
    });
    if (appointmentId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointmentId),
      });
    }
  };

  const resendExpressMutation = useMutation({
    mutationFn: () => resendExpressAppointment(appointmentId!),
    onSuccess: () => {
      toast.success("Completion email resent");
      invalidateAppointmentQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const staffCompleteExpressMutation = useMutation({
    mutationFn: () => staffCompleteExpressAppointment(appointmentId!),
    onSuccess: (saved) => {
      toast.success("Appointment marked complete — now unconfirmed");
      invalidateAppointmentQueries();
      onStatusChange?.(saved.status);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const [checkoutStep, setCheckoutStep] = useState<CheckoutDrawerStep>("items");
  const [paymentAction, setPaymentAction] =
    useState<CheckoutDrawerSubmitAction | null>(null);
  const [closedSaleEditGuardOpen, setClosedSaleEditGuardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const [editHeaderDate, setEditHeaderDate] = useState("");
  const updateFormRef = useRef<AppointmentUpdateFormHandle>(null);
  const timeBlockUpdateFormRef = useRef<TimeBlockUpdateFormHandle>(null);

  useEffect(() => {
    setIsEditing(false);
    setUpdatePending(false);
    setEditHeaderDate("");
  }, [appointmentId]);

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
    setIsEditing(true);
  };

  const exitEditing = () => {
    setIsEditing(false);
    setUpdatePending(false);
    setEditHeaderDate("");
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
  const isTimeBlockView = appointment ? isAppointmentTimeBlock(appointment) : false;
  const title =
    showCheckout && checkoutStep === "payment"
      ? "Payment"
      : showCheckout
        ? "Checkout"
        : isEditing
          ? isTimeBlockView
            ? "Update Time Block"
            : "Update Appointment"
          : isTimeBlockView
            ? isMobile
              ? "Time Block"
              : "Time Block Detail"
            : "Appointment Detail";

  const canMutateThisAppointment = appointment
    ? isTimeBlockView
      ? calendarPerms.canManageTimeBlockOnStaff(appointment.assignedToId)
      : calendarPerms.canManageAppointmentOnStaff(appointment.assignedToId)
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
  const allowEdit = canMutateThisAppointment && !isTimeBlockView;
  const allowTimeBlockEdit = canMutateThisAppointment && isTimeBlockView;
  const allowStatusMenu = canChangeThisStatus;
  const hasAppointmentOverflowMenu =
    !isEditing &&
    ((!isTimeBlockView && allowStatusMenu) ||
      (!isTimeBlockView && Boolean(appointment?.expressBookingPending)) ||
      (!isTimeBlockView && Boolean(onRebook && canMutateThisAppointment)) ||
      allowTimeBlockEdit ||
      (allowCancel && appointment?.status !== "CANCELLED") ||
      allowDelete);

  const contactHeader = appointment
    ? {
        name: getContactDisplayName(appointment.contact, {
          guestFirstName: appointment.guestFirstName,
          guestEmail: appointment.guestEmail,
        }),
        sinceLabel: appointment.contact?.createdAt
          ? `Client since ${new Date(appointment.contact.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
          : appointment.status === "PENDING_COMPLETION"
            ? "Waiting for client to complete Express Booking"
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

  const headerDateLabel = appointment?.startAt
    ? DateTime.fromISO(appointment.startAt, { zone: "utc" })
        .setZone(timezone)
        .toFormat("MMMM d, yyyy")
        .toUpperCase()
    : "";

  const dateFieldLabel = appointment?.startAt
    ? DateTime.fromISO(appointment.startAt, { zone: "utc" })
        .setZone(timezone)
        .toFormat("LLL d, yyyy")
    : "";

  const timeFieldLabel = appointment?.startAt
    ? formatTimeInTimezone(appointment.startAt, timezone)
    : "";

  const drawerFooter = isEditing
    ? (
        <DrawerFooterContent>
          <DrawerPrimaryButton
            disabled={updatePending || isLoading || !appointment}
            onClick={() => {
              if (isTimeBlockView) {
                timeBlockUpdateFormRef.current?.save();
                return;
              }
              updateFormRef.current?.save();
            }}
          >
            {updatePending ? "Saving…" : "Save Changes"}
          </DrawerPrimaryButton>
        </DrawerFooterContent>
      )
    : showCheckout && checkout?.isOpen
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
      {hasAppointmentOverflowMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="Appointment actions" />}
          />
          <DropdownMenuContent align="end" className="w-52">
            {!isTimeBlockView && allowStatusMenu
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
            {!isTimeBlockView && allowStatusMenu ? <DropdownMenuSeparator /> : null}
            {!isTimeBlockView && appointment?.expressBookingPending ? (
              <DropdownMenuItem
                disabled={resendExpressMutation.isPending}
                onClick={() => resendExpressMutation.mutate()}
              >
                Resend completion link
              </DropdownMenuItem>
            ) : null}
            {!isTimeBlockView && onRebook && canMutateThisAppointment ? (
              <DropdownMenuItem onClick={() => onRebook(appointmentId)}>
                Rebook appointment
              </DropdownMenuItem>
            ) : null}
            {allowTimeBlockEdit ? (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {allowTimeBlockEdit ? <DropdownMenuSeparator /> : null}
            {allowCancel && appointment?.status !== "CANCELLED" ? (
              <DropdownMenuItem
                onClick={() => onCancel?.(appointmentId)}
                className="text-destructive focus:text-destructive"
              >
                {isTimeBlockView ? "Cancel time block" : "Cancel appointment"}
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
      ) : null}
      {allowEdit && !isEditing ? (
        <IconButton
          aria-label="Edit appointment"
          size="header"
          onClick={handleEditClick}
        >
          <Pencil className="size-4" />
        </IconButton>
      ) : null}
      {variant === "panel" ? (
        <IconButton
          aria-label="Close appointment details"
          size="header"
          onClick={() => {
            if (isEditing) {
              exitEditing();
              return;
            }
            onClose();
          }}
        >
          <DrawerCloseIcon />
        </IconButton>
      ) : null}
    </>
  );

  const checkoutHeaderActions = (
    <IconButton
      aria-label="Back"
      size="header"
      onClick={handleCheckoutBack}
    >
      <NavArrowIcon direction="left" size="lg" />
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
        onConfirm={() => {
          setClosedSaleEditGuardOpen(false);
          setIsEditing(true);
        }}
      />

      <DrawerShell
        variant={variant}
        width="appointment"
        chrome={isMobile && !showCheckout ? "mobile-brand" : "default"}
        spineLabel={
          showCheckout || isMobile
            ? undefined
            : isTimeBlockView
              ? "TIME BLOCK"
              : "APPOINTMENT DETAIL"
        }
        className={
          isMobile && !showCheckout
            ? APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS
            : APPOINTMENT_DRAWER_SHELL_CLASS
        }
        headerClassName={
          isMobile && !showCheckout
            ? undefined
            : APPOINTMENT_DRAWER_SHELL_HEADER_CLASS
        }
        footerClassName={APPOINTMENT_DRAWER_FOOTER_CLASS}
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isEditing && !showCheckout) {
            exitEditing();
            return;
          }
          onOpenChange?.(nextOpen);
          if (!nextOpen) {
            setCheckoutStep("items");
            setPaymentAction(null);
            onClose();
          }
        }}
        title={
          showCheckout || isMobile ? (
            title
          ) : (
            <DrawerHeaderContent
              eyebrow={
                isEditing
                  ? editHeaderDate || headerDateLabel || undefined
                  : headerDateLabel || undefined
              }
              title={title}
            />
          )
        }
        headerActions={showCheckout ? checkoutHeaderActions : detailHeaderActions}
        showCloseButton={variant === "sheet" && !showCheckout}
        footer={drawerFooter}
        contentClassName="flex min-h-0 flex-1 flex-col !px-0 !py-0"
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
                <div className={APPOINTMENT_DRAWER_BODY_INSET_CLASS}>
                  {isEditing && isTimeBlockView ? (
                    <TimeBlockUpdateForm
                      ref={timeBlockUpdateFormRef}
                      appointment={appointment}
                      timezone={timezone}
                      onSaved={exitEditing}
                      onPendingChange={setUpdatePending}
                      onHeaderDateChange={setEditHeaderDate}
                    />
                  ) : isEditing ? (
                    <AppointmentUpdateForm
                      ref={updateFormRef}
                      appointment={appointment}
                      timezone={timezone}
                      currencyCode={currencyCode}
                      updatedBy={updatedBy}
                      canViewHistory={calendarPerms.canViewHistory}
                      onSaved={exitEditing}
                      onPendingChange={setUpdatePending}
                      onHeaderDateChange={setEditHeaderDate}
                      onMessageClick={onMessageClick}
                    />
                  ) : isTimeBlockView ? (
                    <TimeBlockDetailView
                      appointment={appointment}
                      timezone={timezone}
                      dateLabel={dateFieldLabel}
                      timeLabel={timeFieldLabel}
                      updatedBy={updatedBy}
                      canViewHistory={calendarPerms.canViewHistory}
                    />
                  ) : (
                    <>
                      <AppointmentStatusBar
                        status={appointment.status}
                        relatedCheckoutId={appointment.relatedCheckoutId ?? null}
                        relatedCheckoutStatus={
                          appointment.relatedCheckoutStatus ?? null
                        }
                        waitingNotifiedAt={appointment.waitingNotifiedAt ?? null}
                        expressBookingExpiresAt={
                          appointment.expressBookingExpiresAt ?? null
                        }
                        disabled={
                          !allowStatusMenu ||
                          statusMutation.isPending ||
                          notifyMutation.isPending ||
                          staffCompleteExpressMutation.isPending
                        }
                        onStatusChange={handleStatusChange}
                        onNotify={() => {
                          if (canMutateThisAppointment) notifyMutation.mutate();
                        }}
                        onCompleteExpress={
                          allowStatusMenu
                            ? () => staffCompleteExpressMutation.mutate()
                            : undefined
                        }
                        onCheckout={() => onCheckout(appointment.id)}
                        onViewSale={() => {
                          if (appointment.relatedCheckoutId) {
                            onOpenCheckoutView(appointment.relatedCheckoutId);
                          }
                        }}
                      />

                      <AppointmentDateTimeDisplay
                        dateLabel={dateFieldLabel}
                        timeLabel={timeFieldLabel}
                        onDateClick={allowEdit ? handleEditClick : undefined}
                        onTimeClick={allowEdit ? handleEditClick : undefined}
                      />

                      {appointment.contact ? (
                        <AppointmentClientCard
                          contact={appointment.contact}
                          onRemove={allowEdit ? handleEditClick : undefined}
                          onAddCreditCard={() =>
                            toast.message(
                              "Open the client profile to add a payment method",
                            )
                          }
                          onMessageClick={() =>
                            onMessageClick(appointment.contact!.id)
                          }
                        />
                      ) : appointment.status === "PENDING_COMPLETION" ||
                        appointment.guestFirstName ||
                        appointment.guestEmail ? (
                        <AppointmentGuestCard
                          name={
                            appointment.guestFirstName?.trim() ||
                            appointment.guestEmail?.trim() ||
                            "Guest"
                          }
                          email={appointment.guestEmail}
                          phone={appointment.guestPhone}
                        />
                      ) : null}

                      {(appointment.services ?? []).length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {(appointment.services ?? []).map((line) => (
                            <AppointmentServiceCard
                              key={line.id}
                              line={line}
                              timezone={timezone}
                              currencyCode={currencyCode}
                              onRemove={
                                allowEdit ? () => handleEditClick() : undefined
                              }
                            />
                          ))}
                        </div>
                      ) : null}

                      {allowEdit ? (
                        <AppointmentAddActions
                          variant={isMobile && isEditing ? "outline" : "link"}
                          onAddService={handleEditClick}
                          onAddNote={handleEditClick}
                        />
                      ) : null}

                      {appointment.notes?.trim() ? (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A9A9A]">
                            Notes
                          </p>
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#1A1A1A]">
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
                        <AppointmentBookingDetails
                          createdAt={appointment.createdAt}
                          updatedAt={appointment.updatedAt}
                          createdBy={appointment.createdBy}
                          updatedBy={updatedBy}
                          timezone={timezone}
                          defaultOpen={false}
                        />
                      ) : null}
                    </>
                  )}
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
