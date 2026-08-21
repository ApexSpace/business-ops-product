"use client";

import { DateTime } from "luxon";
import { CreditCard, Mail, MessageSquare, Phone } from "lucide-react";
import { DrawerTrashIcon } from "@/components/drawer/drawer-icons";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { getContactDisplayName } from "@/features/appointments/schemas/appointment-profile";
import {
  APPOINTMENT_DRAWER_CLIENT_ACTION_ICON_CLASS,
  APPOINTMENT_DRAWER_CLIENT_AVATAR_CLASS,
  APPOINTMENT_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CARD_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CONTACT_ICON_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CONTACT_LIST_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CONTACT_ROW_CLASS,
  APPOINTMENT_DRAWER_CLIENT_CREDIT_CARD_CLASS,
  APPOINTMENT_DRAWER_CLIENT_NAME_CLASS,
  APPOINTMENT_DRAWER_CLIENT_SINCE_CLASS,
  APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
  APPOINTMENT_DRAWER_META_ROW_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

function formatClientSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const dt = DateTime.fromISO(createdAt);
  if (!dt.isValid) return null;
  return `Client since ${dt.toFormat("MMMM yyyy")}`;
}

export interface AppointmentClientCardProps {
  contact: NonNullable<Appointment["contact"]>;
  onRemove?: () => void;
  onAddCreditCard?: () => void;
  onMessageClick?: () => void;
  className?: string;
}

export function AppointmentClientCard({
  contact,
  onRemove,
  onAddCreditCard,
  onMessageClick,
  className,
}: AppointmentClientCardProps) {
  const name = getContactDisplayName(contact);
  const phone = contact.phoneNumber?.trim();
  const email = contact.email?.trim();
  const sinceLabel = formatClientSince(contact.createdAt);

  return (
    <div className={cn(APPOINTMENT_DRAWER_CLIENT_CARD_CLASS, className)}>
      <div className="flex min-h-12 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ProfileAvatar
            name={name}
            className={APPOINTMENT_DRAWER_CLIENT_AVATAR_CLASS}
            fallbackClassName={APPOINTMENT_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className={APPOINTMENT_DRAWER_CLIENT_NAME_CLASS}>{name}</p>
            {sinceLabel ? (
              <p className={APPOINTMENT_DRAWER_CLIENT_SINCE_CLASS}>{sinceLabel}</p>
            ) : null}
          </div>
        </div>
        {onRemove ? (
          <button
            type="button"
            aria-label="Remove client"
            className={cn(
              APPOINTMENT_DRAWER_ICON_BUTTON_CLASS,
              "size-6 text-violet-primary-darker [&>svg]:size-6",
            )}
            onClick={onRemove}
          >
            <DrawerTrashIcon className="size-6" />
          </button>
        ) : null}
      </div>

      <div className={APPOINTMENT_DRAWER_CLIENT_CONTACT_LIST_CLASS}>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ROW_CLASS}
          >
            <Phone className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ICON_CLASS} aria-hidden />
            <span className="min-w-0 truncate">{phone}</span>
          </a>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}`}
            className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ROW_CLASS}
          >
            <Mail className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ICON_CLASS} aria-hidden />
            <span className="min-w-0 truncate">{email}</span>
          </a>
        ) : null}
        <button
          type="button"
          className={APPOINTMENT_DRAWER_CLIENT_CREDIT_CARD_CLASS}
          onClick={onAddCreditCard}
        >
          <CreditCard className={APPOINTMENT_DRAWER_CLIENT_ACTION_ICON_CLASS} aria-hidden />
          Add credit card
        </button>
        {onMessageClick ? (
          <button
            type="button"
            className={APPOINTMENT_DRAWER_CLIENT_CREDIT_CARD_CLASS}
            onClick={onMessageClick}
          >
            <MessageSquare
              className={APPOINTMENT_DRAWER_CLIENT_ACTION_ICON_CLASS}
              aria-hidden
            />
            Message Client
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface AppointmentGuestCardProps {
  name: string;
  email?: string | null;
  phone?: string | null;
  subtitle?: string;
  className?: string;
}

export function AppointmentGuestCard({
  name,
  email,
  phone,
  subtitle = "Pending Express Booking completion",
  className,
}: AppointmentGuestCardProps) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_CLIENT_CARD_CLASS, className)}>
      <div className="flex items-start gap-4">
        <ProfileAvatar
          name={name}
          className={APPOINTMENT_DRAWER_CLIENT_AVATAR_CLASS}
          fallbackClassName={APPOINTMENT_DRAWER_CLIENT_AVATAR_FALLBACK_CLASS}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-5 text-[#1A1A1A]">
            {name}
          </p>
          <p className="mt-0.5 text-[12px] leading-[15px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {phone ? (
          <div className={APPOINTMENT_DRAWER_META_ROW_CLASS}>
            <Phone className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ICON_CLASS} aria-hidden />
            <span className="min-w-0 truncate">{phone}</span>
          </div>
        ) : null}
        {email ? (
          <div className={APPOINTMENT_DRAWER_META_ROW_CLASS}>
            <Mail className={APPOINTMENT_DRAWER_CLIENT_CONTACT_ICON_CLASS} aria-hidden />
            <span className="min-w-0 truncate">{email}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}