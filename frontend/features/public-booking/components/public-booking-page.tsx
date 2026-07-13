"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createPublicBooking,
  createPublicBookingCheckout,
  getPublicBookingAvailability,
  getPublicBookingBusiness,
  getPublicBookingCatalog,
  getPublicBookingStaff,
  joinBookingWaitlist,
} from "@/features/public-booking/api/public-booking.api";
import type {
  PublicBookingBusiness,
  PublicBookingCatalogService,
  PublicBookingConfirmation,
  PublicBookingServiceLineSelection,
  PublicBookingSlot,
  PublicBookingStaff,
} from "@/features/public-booking/schemas/public-booking";
import {
  normalizeTimezone,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { phoneToApiFields } from "@/lib/forms/phone";
import { getBookingErrorView } from "@/features/public-booking/utils/booking-errors";
import { formatSlotSummary, formatTimeRange } from "@/features/public-booking/utils/booking-format";
import { useIsCompactBooking } from "@/features/public-booking/hooks/use-compact-booking";
import { BookingInfoPanel } from "@/features/public-booking/components/booking-info-panel";
import { BookingMobileHeader } from "@/features/public-booking/components/booking-mobile-header";
import { BookingMonthCalendar } from "@/features/public-booking/components/booking-month-calendar";
import { BookingTimeSlots } from "@/features/public-booking/components/booking-time-slots";
import { BookingDetailsForm } from "@/features/public-booking/components/booking-details-form";
import { BookingSuccessView } from "@/features/public-booking/components/booking-success-view";
import { BookingServiceCatalog } from "@/features/public-booking/components/booking-service-catalog";
import { BookingStaffPicker } from "@/features/public-booking/components/booking-staff-picker";
import { BookingServiceCart } from "@/features/public-booking/components/booking-service-cart";
import { BookingWaitlistForm } from "@/features/public-booking/components/booking-waitlist-form";
import type { BookingWaitlistFormValues } from "@/features/public-booking/components/booking-waitlist-form";
import { BookingWaitlistSuccess } from "@/features/public-booking/components/booking-waitlist-success";
import {
  publicHasOfferCodes,
  validatePublicOfferCode,
} from "@/features/offers/api/offers.api";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/errors";

type Phase = "services" | "staff" | "cart" | "schedule" | "details" | "success" | "waitlist-success";
type ScheduleStep = "date" | "time";
type DetailsStep = "form" | "payment";

interface PublicBookingPageProps {
  slug: string;
  embed?: boolean;
}

function resolveAccent(business: PublicBookingBusiness): string {
  return business.brandColor ?? "#0069ff";
}

export function PublicBookingPage({ slug, embed = false }: PublicBookingPageProps) {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get("serviceId");
  const initialStaffId = searchParams.get("staffId");

  const isCompact = useIsCompactBooking();
  const [phase, setPhase] = useState<Phase>(
    initialServiceId ? (initialStaffId ? "schedule" : "staff") : "services",
  );
  const [scheduleStep, setScheduleStep] = useState<ScheduleStep>("date");
  const [selectedService, setSelectedService] =
    useState<PublicBookingCatalogService | null>(null);
  const [serviceLines, setServiceLines] = useState<
    PublicBookingServiceLineSelection[]
  >([]);
  const [selectedStaff, setSelectedStaff] = useState<PublicBookingStaff | null>(
    null,
  );
  const [genderFilter, setGenderFilter] = useState<"FEMALE" | "MALE" | null>(
    null,
  );
  const [viewerTimezone, setViewerTimezone] = useState("UTC");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<PublicBookingSlot | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<PublicBookingSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [bookedForFirstName, setBookedForFirstName] = useState("");
  const [bookedForLastName, setBookedForLastName] = useState("");
  const [bookedForEmail, setBookedForEmail] = useState("");
  const [bookForSomeoneElse, setBookForSomeoneElse] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [reminderOptIn, setReminderOptIn] = useState(true);
  const [offerCode, setOfferCode] = useState("");
  const [validatedOfferName, setValidatedOfferName] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<PublicBookingConfirmation | null>(null);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [detailsStep, setDetailsStep] = useState<DetailsStep>("form");
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{
    clientSecret: string;
    publishableKey: string;
    stripeAccountId: string;
    amountLabel: string;
  } | null>(null);

  const {
    data: business,
    isLoading: businessLoading,
    error: businessError,
  } = useQuery({
    queryKey: ["public-booking-business", slug],
    queryFn: () => getPublicBookingBusiness(slug),
    enabled: !!slug,
    retry: false,
  });

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["public-booking-catalog", slug, initialStaffId],
    queryFn: () => getPublicBookingCatalog(slug, initialStaffId ?? undefined),
    enabled: !!business && !!slug,
  });

  const serviceId = selectedService?.id ?? initialServiceId ?? undefined;
  const allowMultipleServices = Boolean(
    business?.bookingRules.allowMultipleServices,
  );
  const allowDuplicateServices = Boolean(
    business?.bookingRules.allowDuplicateServices,
  );
  const singleStaffOnly = Boolean(business?.bookingRules.singleStaffOnly);

  const filteredCatalog = useMemo(() => {
    if (allowDuplicateServices) return catalog;
    const selectedIds = new Set(serviceLines.map((line) => line.service.id));
    return catalog
      .map((category) => ({
        ...category,
        services: category.services.filter(
          (service) => !selectedIds.has(service.id),
        ),
      }))
      .filter((category) => category.services.length > 0);
  }, [catalog, serviceLines, allowDuplicateServices]);

  const availabilityServiceLines = useMemo(
    () =>
      serviceLines.map((line) => ({
        serviceId: line.service.id,
        staffId: line.staff.isAnyone ? undefined : line.staff.id,
      })),
    [serviceLines],
  );

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["public-booking-staff", slug, serviceId, genderFilter],
    queryFn: () =>
      getPublicBookingStaff(slug, serviceId!, genderFilter ?? undefined),
    enabled: !!business && !!slug && !!serviceId && phase !== "services",
  });

  useEffect(() => {
    if (!catalog.length || !initialServiceId || serviceLines.length > 0) return;
    for (const cat of catalog) {
      const svc = cat.services.find((s) => s.id === initialServiceId);
      if (svc) {
        setSelectedService(svc);
        break;
      }
    }
  }, [catalog, initialServiceId, serviceLines.length]);

  useEffect(() => {
    if (
      !staff.length ||
      !initialStaffId ||
      serviceLines.length > 0 ||
      !selectedService
    ) {
      return;
    }
    const match = staff.find((s) => s.id === initialStaffId);
    if (match) {
      setServiceLines([{ service: selectedService, staff: match }]);
      setSelectedStaff(match);
      setPhase("schedule");
    }
  }, [staff, initialStaffId, selectedService, serviceLines.length]);

  const offerCodesQuery = useQuery({
    queryKey: ["public-offer-codes", slug],
    queryFn: () => publicHasOfferCodes(slug),
    enabled: !!slug,
  });

  const bookingTimezone = normalizeTimezone(business?.timezone);

  useEffect(() => {
    if (business?.timezone) {
      setViewerTimezone(bookingTimezone);
    }
  }, [business?.timezone, bookingTimezone]);

  const availabilityRange = useMemo(() => {
    const start = DateTime.now().setZone(bookingTimezone).startOf("day");
    const end = start.plus({
      days: business?.bookingRules.maxBookingDays ?? 60,
    });
    return {
      from: start.toUTC().toISO()!,
      to: end.toUTC().toISO()!,
      timezone: bookingTimezone,
    };
  }, [bookingTimezone, business?.bookingRules.maxBookingDays]);

  const {
    data: availability = [],
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
  } = useQuery({
    queryKey: [
      "public-booking-availability",
      slug,
      availabilityServiceLines,
      availabilityRange,
    ],
    queryFn: () =>
      getPublicBookingAvailability(slug, {
        ...availabilityRange,
        serviceLines: availabilityServiceLines,
      }),
    enabled:
      !!business &&
      !!slug &&
      serviceLines.length > 0 &&
      phase === "schedule",
    placeholderData: (prev) => prev,
  });

  const bookableDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const day of availability) {
      if (day.slots.length > 0) set.add(day.date);
    }
    return set;
  }, [availability]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const day = availability.find((d) => d.date === selectedDate);
    return day?.slots.filter((s) => s.available !== false) ?? [];
  }, [availability, selectedDate]);

  const validateOfferMutation = useMutation({
    mutationFn: () => validatePublicOfferCode(slug, offerCode.trim()),
    onSuccess: (offer) => {
      setValidatedOfferName(offer.name);
      toast.success(`Offer "${offer.name}" applied`);
    },
    onError: (err: Error) => {
      setValidatedOfferName(null);
      toast.error(err.message);
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: (values: BookingWaitlistFormValues) => {
      if (!serviceLines[0]?.service.id || !selectedDate) {
        throw new Error("Missing waitlist context");
      }
      const phoneFields = phoneToApiFields(values.customerPhone);
      const customerName = `${values.customerFirstName.trim()} ${values.customerLastName.trim()}`.trim();
      const additionalServiceIds = serviceLines
        .slice(1)
        .map((line) => line.service.id);
      return joinBookingWaitlist(slug, {
        serviceId: serviceLines[0].service.id,
        additionalServiceIds:
          additionalServiceIds.length > 0 ? additionalServiceIds : undefined,
        staffId: serviceLines[0].staff.isAnyone
          ? undefined
          : serviceLines[0].staff.id,
        preferredDate: selectedDate,
        customerName,
        customerFirstName: values.customerFirstName.trim(),
        customerLastName: values.customerLastName.trim(),
        customerEmail: values.customerEmail.trim() || undefined,
        phoneCountryCode: phoneFields.phoneCountryCode ?? undefined,
        phoneNumber: phoneFields.phoneNumber ?? undefined,
        preferredMorning: values.preferredMorning,
        preferredAfternoon: values.preferredAfternoon,
        preferredEvening: values.preferredEvening,
        comments: values.comments.trim() || undefined,
      });
    },
    onSuccess: () => {
      setWaitlistJoined(true);
      setPhase("waitlist-success");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bookMutation = useMutation({
    mutationFn: (params?: { holdToken?: string; paymentIntentId?: string }) => {
      const slot = confirmedSlot;
      if (!slot || !business || serviceLines.length === 0) {
        throw new Error("Missing slot");
      }
      const phoneFields = phoneToApiFields(customerPhone);
      const primaryLine = serviceLines[0];
      return createPublicBooking(slug, {
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: bookingTimezone,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        phoneCountryCode: phoneFields.phoneCountryCode ?? undefined,
        phoneNumber: phoneFields.phoneNumber ?? undefined,
        notes: notes.trim() || undefined,
        homeAddress: homeAddress.trim() || undefined,
        offerCode: offerCode.trim() || undefined,
        serviceLines: serviceLines.map((line) => ({
          serviceId: line.service.id,
          staffId: line.staff.isAnyone ? undefined : line.staff.id,
        })),
        serviceId: primaryLine.service.id,
        staffId: primaryLine.staff.isAnyone
          ? undefined
          : primaryLine.staff.id,
        anyone: primaryLine.staff.isAnyone,
        bookedForFirstName: bookForSomeoneElse
          ? bookedForFirstName.trim() || undefined
          : undefined,
        bookedForLastName: bookForSomeoneElse
          ? bookedForLastName.trim() || undefined
          : undefined,
        bookedForEmail: bookForSomeoneElse
          ? bookedForEmail.trim() || undefined
          : undefined,
        policyAgreed,
        reminderOptIn,
        source: embed ? "BOOKING_WIDGET" : "PUBLIC_LINK",
        holdToken: params?.holdToken ?? holdToken ?? undefined,
        paymentIntentId: params?.paymentIntentId ?? paymentIntentId ?? undefined,
      });
    },
    onSuccess: (result) => {
      setConfirmation(result);
      setPhase("success");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError && err.status === 409) {
        toast.error(
          err.message ||
            "This time is no longer available. Please pick another staff member or time.",
        );
        setPhase(allowMultipleServices ? "cart" : "schedule");
        setConfirmedSlot(null);
        setPendingSlot(null);
        setScheduleStep("time");
      } else if (err instanceof Error) {
        toast.error(err.message);
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const slot = confirmedSlot;
      const primary = serviceLines[0];
      if (!slot || !primary) throw new Error("Missing slot");
      const phoneFields = phoneToApiFields(customerPhone);
      return createPublicBookingCheckout(slug, {
        serviceId: primary.service.id,
        staffId: primary.staff.isAnyone ? undefined : primary.staff.id,
        anyone: primary.staff.isAnyone,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: bookingTimezone,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        phoneCountryCode: phoneFields.phoneCountryCode ?? undefined,
        phoneNumber: phoneFields.phoneNumber ?? undefined,
        isEmbed: embed,
      });
    },
    onSuccess: async (checkout) => {
      setHoldToken(checkout.holdToken);

      if (!checkout.paymentRequired) {
        bookMutation.mutate({ holdToken: checkout.holdToken });
        return;
      }

      if (!checkout.publishableKey || !checkout.clientSecret) {
        toast.error("Online payments are not configured for this business.");
        return;
      }

      const price =
        serviceLines.reduce((total, line) => {
          const value = line.staff.price ?? line.service.price;
          return value ? total + Number.parseFloat(value) : total;
        }, 0) ||
        (checkout.amountCents > 0
          ? checkout.amountCents / 100
          : null);
      const amountLabel =
        typeof price === "number" && price > 0
          ? `$${price.toFixed(2)}`
          : "the service fee";

      setPaymentIntentId(checkout.paymentIntentId);
      setPaymentConfig({
        clientSecret: checkout.clientSecret,
        publishableKey: checkout.publishableKey,
        stripeAccountId: checkout.stripeAccountId ?? "",
        amountLabel,
      });
      setDetailsStep("payment");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
    },
  });

  const handleDetailsSubmit = () => {
    if (serviceLines.some((line) => line.service.paymentRequired)) {
      checkoutMutation.mutate();
      return;
    }
    bookMutation.mutate(undefined);
  };

  const handlePaymentSuccess = () => {
    if (!holdToken || !paymentIntentId) {
      toast.error("Payment session expired. Please try again.");
      setDetailsStep("form");
      return;
    }
    bookMutation.mutate({ holdToken, paymentIntentId });
  };

  const serviceSummaries = useMemo(() => {
    if (confirmation?.serviceLines?.length) {
      return confirmation.serviceLines.map((line) => ({
        serviceName: line.serviceName,
        staffName: line.staffName ?? "Staff",
        timeLabel: formatTimeRange(line.startAt, line.endAt, viewerTimezone),
        price: line.price,
      }));
    }
    if (!confirmedSlot) return [];
    if (confirmedSlot.serviceLines?.length) {
      return confirmedSlot.serviceLines.map((segment) => {
        const line = serviceLines.find(
          (entry) => entry.service.id === segment.serviceId,
        );
        return {
          serviceName: line?.service.name ?? "Service",
          staffName: line?.staff.name ?? "Staff",
          timeLabel: formatTimeRange(
            segment.startAt,
            segment.endAt,
            viewerTimezone,
          ),
          price: line?.staff.price ?? line?.service.price ?? null,
        };
      });
    }
    if (!selectedDate) return [];
    const primaryLine = serviceLines[0];
    return [
      {
        serviceName: primaryLine?.service.name ?? "Service",
        staffName: primaryLine?.staff.name ?? "Staff",
        timeLabel: formatTimeRange(
          confirmedSlot.startAt,
          confirmedSlot.endAt,
          viewerTimezone,
        ),
        price: primaryLine?.staff.price ?? primaryLine?.service.price ?? null,
      },
    ];
  }, [
    confirmation,
    confirmedSlot,
    selectedDate,
    serviceLines,
    viewerTimezone,
  ]);

  if (businessLoading) {
    return <BookingPageSkeleton compact={isCompact} />;
  }

  if (businessError || !business) {
    const err = getBookingErrorView(businessError);
    return <BookingUnavailable title={err.title} message={err.message} />;
  }

  const accent = resolveAccent(business);
  const primaryLine = serviceLines[0];
  const durationMinutes =
    serviceLines.reduce(
      (total, line) =>
        total +
        (line.staff.durationMinutes ??
          line.service.durationMinutes ??
          30),
      0,
    ) ||
    selectedService?.durationMinutes ||
    30;
  const slotDurationMinutes =
    serviceLines.reduce(
      (total, line) =>
        total +
        (line.staff.clientOccupancyMinutes ??
          line.service.clientOccupancyMinutes ??
          line.service.durationMinutes ??
          30),
      0,
    ) ||
    selectedStaff?.clientOccupancyMinutes ||
    selectedService?.clientOccupancyMinutes ||
    durationMinutes;

  const slotSummary =
    confirmedSlot && selectedDate
      ? formatSlotSummary(
          selectedDate,
          confirmedSlot,
          viewerTimezone,
          slotDurationMinutes,
        )
      : null;

  const availabilityLoadingState = availabilityLoading || availabilityFetching;
  const selectedDateLabel = selectedDate
    ? parseDateKeyInTimezone(selectedDate, bookingTimezone).toFormat("ccc, LLL d")
    : null;
  const waitlistServiceLabel =
    serviceLines.length === 1
      ? serviceLines[0].service.name
      : `${serviceLines.length} services`;
  const waitlistStaffLabel = serviceLines[0]?.staff.isAnyone
    ? undefined
    : serviceLines[0]?.staff.name;
  const waitlistContext = {
    serviceLabel: waitlistServiceLabel,
    staffLabel: waitlistStaffLabel,
    dateLabel: selectedDateLabel ?? undefined,
  };
  const handleJoinWaitlist = (values: BookingWaitlistFormValues) => {
    waitlistMutation.mutate(values);
  };

  if (phase === "waitlist-success" && business && selectedDate) {
    return (
      <div
        className={cn(
          "mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-lg",
          embed ? "max-w-3xl" : "max-w-4xl",
        )}
      >
        <BookingWaitlistSuccess
          businessName={business.businessName}
          dateLabel={parseDateKeyInTimezone(selectedDate, bookingTimezone).toFormat(
            "cccc, LLL d, yyyy",
          )}
          serviceLabel={waitlistServiceLabel}
          staffLabel={waitlistStaffLabel}
        />
      </div>
    );
  }

  if (phase === "success" && confirmation) {
    return (
      <div
        className={cn(
          "mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-lg",
          embed ? "max-w-3xl" : "max-w-4xl",
        )}
      >
        <BookingSuccessView
          calendar={business as never}
          business={business}
          confirmation={confirmation}
          customerName={customerName}
          accentColor={accent}
          embed={embed}
          compact={isCompact}
          serviceSummaries={serviceSummaries}
        />
      </div>
    );
  }

  const shellClass = cn(
    "mx-auto w-full overflow-hidden rounded-xl border bg-card shadow-lg",
    embed ? "max-w-3xl" : isCompact ? "max-w-lg" : "max-w-5xl",
  );

  if (phase === "services") {
    return (
      <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
        <BookingServiceCatalog
          business={business}
          categories={filteredCatalog}
          accentColor={accent}
          loading={catalogLoading}
          onSelectService={(svc) => {
            setSelectedService(svc);
            if (singleStaffOnly && serviceLines.length > 0) {
              const sharedStaff = serviceLines[0].staff;
              setSelectedStaff(sharedStaff);
              setServiceLines((prev) => [...prev, { service: svc, staff: sharedStaff }]);
              setPhase("cart");
              return;
            }
            setSelectedStaff(null);
            setPhase("staff");
          }}
        />
      </div>
    );
  }

  if (phase === "staff" && selectedService) {
    return (
      <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
        <BookingStaffPicker
          serviceName={selectedService.name}
          staff={staff}
          selectedStaffId={selectedStaff?.id ?? null}
          accentColor={accent}
          loading={staffLoading}
          onBack={() => {
            if (serviceLines.length > 0) {
              setPhase("cart");
            } else {
              setPhase("services");
            }
            setSelectedService(null);
          }}
          onSelectStaff={(member) => {
            const line = { service: selectedService, staff: member };
            if (allowMultipleServices) {
              setServiceLines((prev) => [...prev, line]);
              setSelectedService(null);
              setSelectedStaff(null);
              setPhase("cart");
              return;
            }
            setServiceLines([line]);
            setSelectedStaff(member);
            setPhase("schedule");
            setScheduleStep("date");
          }}
          genderFilter={genderFilter}
          onGenderFilter={setGenderFilter}
        />
      </div>
    );
  }

  if (phase === "cart" && serviceLines.length > 0) {
    return (
      <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
        <BookingServiceCart
          business={business}
          lines={serviceLines}
          categories={filteredCatalog}
          catalogLoading={catalogLoading}
          accentColor={accent}
          allowMultipleServices={allowMultipleServices}
          onBack={() => {
            if (serviceLines.length === 1) {
              setPhase("staff");
              setSelectedService(serviceLines[0].service);
              setSelectedStaff(null);
              setServiceLines([]);
              return;
            }
            setPhase("services");
          }}
          onRemoveLine={(index) => {
            setServiceLines((prev) => {
              const next = prev.filter((_, i) => i !== index);
              if (next.length === 0) {
                setPhase("services");
                setSelectedService(null);
                setSelectedStaff(null);
              }
              return next;
            });
          }}
          onAddAnother={() => {
            setSelectedService(null);
            setPhase("services");
          }}
          onSelectAdditionalService={(svc) => {
            if (singleStaffOnly && serviceLines.length > 0) {
              const sharedStaff = serviceLines[0].staff;
              setServiceLines((prev) => [...prev, { service: svc, staff: sharedStaff }]);
              return;
            }
            setSelectedService(svc);
            setSelectedStaff(null);
            setPhase("staff");
          }}
          onContinue={() => {
            setPhase("schedule");
            setScheduleStep("date");
          }}
        />
      </div>
    );
  }

  const scheduleContent = (
    <>
      {scheduleStep === "date" ? (
        <div className="p-4 sm:p-6">
          <p className="mb-4 text-sm font-semibold">Select a date</p>
          <BookingMonthCalendar
            timezone={bookingTimezone}
            bookableDates={bookableDateSet}
            selectedDate={selectedDate}
            maxBookingDays={business.bookingRules.maxBookingDays}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setPendingSlot(null);
              if (isCompact) setScheduleStep("time");
            }}
            accentColor={accent}
          />
          {selectedDate &&
          !availabilityLoadingState &&
          slotsForSelectedDate.length === 0 &&
          business.bookingRules.waitlistEnabled ? (
            waitlistJoined ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You are on the waitlist for this date. We will contact you when
                a slot opens.
              </p>
            ) : (
              <BookingWaitlistForm
                accentColor={accent}
                submitting={waitlistMutation.isPending}
                {...waitlistContext}
                onSubmit={handleJoinWaitlist}
              />
            )
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="border-b px-4 py-2.5 text-sm font-semibold">
            {selectedDateLabel ?? "Select a time"}
          </p>
          <BookingTimeSlots
            slots={slotsForSelectedDate}
            loading={availabilityLoadingState}
            selectedDate={selectedDate}
            timezone={viewerTimezone}
            durationMinutes={durationMinutes}
            slotDurationMinutes={slotDurationMinutes}
            pendingSlotStart={pendingSlot?.startAt ?? null}
            accentColor={accent}
            onSelectSlot={(slot) => setPendingSlot(slot)}
            onConfirmSlot={() => {
              if (pendingSlot) {
                setConfirmedSlot(pendingSlot);
                setPendingSlot(null);
                setPhase("details");
              }
            }}
            fullHeight={isCompact}
            waitlistEnabled={Boolean(business?.bookingRules.waitlistEnabled)}
            waitlistJoined={waitlistJoined}
            waitlistSubmitting={waitlistMutation.isPending}
            waitlistContext={waitlistContext}
            onJoinWaitlist={handleJoinWaitlist}
          />
        </div>
      )}
    </>
  );

  if (phase === "schedule") {
    if (isCompact) {
      return (
        <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
          <BookingMobileHeader
            calendar={business as never}
            business={business}
            accentColor={accent}
            step={scheduleStep}
            subtitle={
              serviceLines.length === 1
                ? serviceLines[0].service.name
                : `${serviceLines.length} services`
            }
            metaLabel={
              scheduleStep === "time" && selectedDateLabel
                ? selectedDateLabel
                : undefined
            }
            onBack={() => {
              if (scheduleStep === "time") {
                setScheduleStep("date");
                setPendingSlot(null);
              } else {
                setPhase(allowMultipleServices ? "cart" : "staff");
              }
            }}
          />
          {scheduleContent}
        </div>
      );
    }

    return (
      <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
        <div className="flex flex-col lg:flex-row lg:min-h-[560px]">
          <aside className="lg:w-[38%] lg:shrink-0">
            <BookingInfoPanel
              business={business}
              calendar={business as never}
              accentColor={accent}
              timezone={viewerTimezone}
              onTimezoneChange={setViewerTimezone}
              summary={
                slotSummary
                  ? {
                      dateLabel: slotSummary.dateLabel,
                      timeLabel: slotSummary.timeLabel,
                    }
                  : null
              }
            />
          </aside>
          <div className="flex min-h-0 flex-1 flex-col border-t lg:border-t-0 lg:border-l">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setPhase(allowMultipleServices ? "cart" : "staff")
                }
              >
                ← Staff
              </button>
              <span className="text-sm font-medium">
                {serviceLines.length === 1
                  ? serviceLines[0].service.name
                  : `${serviceLines.length} services`}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <div className="border-b p-4 sm:p-6 md:w-[55%] md:border-b-0 md:border-r md:overflow-y-auto lg:p-8">
                {scheduleContent}
              </div>
              <div className="flex min-h-0 flex-1 flex-col md:w-[45%]">
                <p className="shrink-0 border-b px-4 py-3 text-sm font-semibold sm:px-6">
                  {selectedDateLabel ?? "Select a time"}
                </p>
                <BookingTimeSlots
                  slots={slotsForSelectedDate}
                  loading={availabilityLoadingState}
                  selectedDate={selectedDate}
                  timezone={viewerTimezone}
                  durationMinutes={durationMinutes}
                  slotDurationMinutes={slotDurationMinutes}
                  pendingSlotStart={pendingSlot?.startAt ?? null}
                  accentColor={accent}
                  onSelectSlot={(slot) => setPendingSlot(slot)}
                  onConfirmSlot={() => {
                    if (pendingSlot) {
                      setConfirmedSlot(pendingSlot);
                      setPendingSlot(null);
                      setPhase("details");
                    }
                  }}
                  waitlistEnabled={Boolean(business?.bookingRules.waitlistEnabled)}
                  waitlistJoined={waitlistJoined}
                  waitlistSubmitting={waitlistMutation.isPending}
                  waitlistContext={waitlistContext}
                  onJoinWaitlist={handleJoinWaitlist}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "details" && confirmedSlot && selectedDate && slotSummary) {
    return (
      <div className={shellClass} style={{ ["--booking-accent" as string]: accent }}>
        <BookingDetailsForm
          business={business}
          calendar={business as never}
          accentColor={accent}
          summary={slotSummary}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          notes={notes}
          homeAddress={homeAddress}
          requireHomeAddress={serviceLines.some((line) =>
            Boolean(line.service.requireHomeAddress),
          )}
          paymentRequired={serviceLines.some((line) =>
            Boolean(line.service.paymentRequired),
          )}
          servicePrice={
            serviceLines.length === 1
              ? (serviceLines[0].staff.price ?? serviceLines[0].service.price)
              : null
          }
          serviceSummaries={serviceSummaries}
          detailsStep={detailsStep}
          paymentConfig={paymentConfig}
          bookForSomeoneElse={bookForSomeoneElse}
          bookedForFirstName={bookedForFirstName}
          bookedForLastName={bookedForLastName}
          bookedForEmail={bookedForEmail}
          policyAgreed={policyAgreed}
          reminderOptIn={reminderOptIn}
          showOfferCode={offerCodesQuery.data?.hasOfferCodes}
          offerCode={offerCode}
          validatedOfferName={validatedOfferName}
          submitting={bookMutation.isPending}
          checkoutLoading={checkoutMutation.isPending}
          submitError={
            bookMutation.error instanceof Error
              ? bookMutation.error.message
              : checkoutMutation.error instanceof Error
                ? checkoutMutation.error.message
                : bookMutation.error || checkoutMutation.error
                  ? "Request failed"
                  : null
          }
          onBack={() => {
            if (detailsStep === "payment") {
              setDetailsStep("form");
              setPaymentConfig(null);
              setPaymentIntentId(null);
              return;
            }
            setPhase("schedule");
            setConfirmedSlot(null);
            setDetailsStep("form");
            setHoldToken(null);
            setPaymentIntentId(null);
            setPaymentConfig(null);
            setScheduleStep("time");
          }}
          onChange={(field, value) => {
            if (field === "customerName") setCustomerName(value);
            if (field === "customerEmail") setCustomerEmail(value);
            if (field === "customerPhone") setCustomerPhone(value);
            if (field === "notes") setNotes(value);
            if (field === "homeAddress") setHomeAddress(value);
            if (field === "offerCode") {
              setOfferCode(value);
              setValidatedOfferName(null);
            }
            if (field === "bookedForFirstName") setBookedForFirstName(value);
            if (field === "bookedForLastName") setBookedForLastName(value);
            if (field === "bookedForEmail") setBookedForEmail(value);
            if (field === "bookForSomeoneElse")
              setBookForSomeoneElse(value === "true");
            if (field === "policyAgreed") setPolicyAgreed(value === "true");
            if (field === "reminderOptIn") setReminderOptIn(value === "true");
          }}
          onValidateOfferCode={() => {
            if (offerCode.trim()) validateOfferMutation.mutate();
          }}
          onSubmit={handleDetailsSubmit}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={(message) => toast.error(message)}
          compact={isCompact}
        />
      </div>
    );
  }

  return <BookingPageSkeleton compact={isCompact} />;
}

function BookingPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto overflow-hidden rounded-xl border bg-card shadow-lg",
        compact ? "max-w-lg" : "max-w-5xl w-full",
      )}
    >
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" style={{ color: "#0069ff" }} />
        <p className="text-sm">Loading scheduling page…</p>
      </div>
    </div>
  );
}

function BookingUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm sm:p-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

export default function PublicBookingRoutePage({
  params,
  embed = false,
}: {
  params: Promise<{ slug: string }>;
  embed?: boolean;
}) {
  const { slug } = use(params);
  return <PublicBookingPage slug={slug} embed={embed} />;
}
