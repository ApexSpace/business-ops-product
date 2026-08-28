"use client";

import { useState } from "react";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DRAWER_FIELD_CLASS,
  DRAWER_FORM_FIELDS_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS,
} from "@/lib/design/drawer-tokens";
import {
  CONTACTS_TIME_FILTER_OPTIONS,
  FILTER_ALL_LABELS,
} from "@/lib/ui/filter-labels";
import { cn } from "@/lib/utils";

export type ContactsTimeFilter = "all" | "30d" | "90d" | "1y";

export interface ContactsOptionsValues {
  profileCreated: ContactsTimeFilter;
  hadFirstAppointment: ContactsTimeFilter;
  hadAppointment: ContactsTimeFilter;
  hadAppointmentWith: string;
  lastAppointment: string;
  futureAppointment: string;
  hadService: string;
  hadServiceCategory: string;
  gender: string;
  referredBy: string;
  tag: string;
}

export const EMPTY_CONTACTS_OPTIONS: ContactsOptionsValues = {
  profileCreated: "all",
  hadFirstAppointment: "all",
  hadAppointment: "all",
  hadAppointmentWith: "",
  lastAppointment: "",
  futureAppointment: "",
  hadService: "",
  hadServiceCategory: "",
  gender: "",
  referredBy: "",
  tag: "",
};

const TIME_OPTIONS = CONTACTS_TIME_FILTER_OPTIONS;

export interface ContactsOptionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: ContactsOptionsValues;
  onApply: (values: ContactsOptionsValues) => void;
  onDownload?: () => void;
  onImport?: () => void;
  downloadPending?: boolean;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-[var(--drawer-text-body)]">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Figma Contacts Options sidebar — shared OptionsFilterDrawer + domain fields. */
export function ContactsOptionsDrawer({
  open,
  onOpenChange,
  values,
  onApply,
  onDownload,
  onImport,
  downloadPending = false,
}: ContactsOptionsDrawerProps) {
  const [draft, setDraft] = useState<ContactsOptionsValues>(values);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(values);
    onOpenChange(next);
  };

  const update = <K extends keyof ContactsOptionsValues>(
    key: K,
    value: ContactsOptionsValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <OptionsFilterDrawer
      open={open}
      onOpenChange={handleOpenChange}
      spineLabel="OPTIONS"
      applyLabel={downloadPending ? "Downloading…" : "Download"}
      applyDisabled={downloadPending}
      onApply={() => {
        onApply(draft);
        onDownload?.();
      }}
      showMoreAction={false}
      headerActions={<MoreActionsButton aria-label="More options" />}
      leading={
        onImport ? (
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onImport();
            }}
            className={cn(
              DRAWER_FIELD_CLASS,
              "mb-6 inline-flex items-center justify-center border-violet-primary-normal font-semibold text-violet-primary-normal",
            )}
          >
            Import contacts
          </button>
        ) : null
      }
    >
      <div className={DRAWER_FORM_FIELDS_CLASS}>
        <Field label="Client Profile Created">
          <Select
            value={draft.profileCreated}
            onValueChange={(v) =>
              update("profileCreated", (v ?? "all") as ContactsTimeFilter)
            }
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder={FILTER_ALL_LABELS.time} />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Had First Appointment">
          <Select
            value={draft.hadFirstAppointment}
            onValueChange={(v) =>
              update(
                "hadFirstAppointment",
                (v ?? "all") as ContactsTimeFilter,
              )
            }
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder={FILTER_ALL_LABELS.time} />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Had Appointment">
          <Select
            value={draft.hadAppointment}
            onValueChange={(v) =>
              update("hadAppointment", (v ?? "all") as ContactsTimeFilter)
            }
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder={FILTER_ALL_LABELS.time} />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Had Appointment With">
          <Select
            value={draft.hadAppointmentWith || undefined}
            onValueChange={(v) => update("hadAppointmentWith", v ?? "")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder={FILTER_ALL_LABELS.time} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{FILTER_ALL_LABELS.time}</SelectItem>
              <SelectItem value="any">Any Staff</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Last Appointment">
          <Select
            value={draft.lastAppointment || undefined}
            onValueChange={(v) => update("lastAppointment", v ?? "")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Date</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Future Appointment">
          <Select
            value={draft.futureAppointment || undefined}
            onValueChange={(v) => update("futureAppointment", v ?? "")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Has Upcoming</SelectItem>
              <SelectItem value="none">None Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Had Service">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Select a Service"
            value={draft.hadService}
            onChange={(e) => update("hadService", e.target.value)}
          />
        </Field>

        <Field label="Had Service in Category">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Select"
            value={draft.hadServiceCategory}
            onChange={(e) => update("hadServiceCategory", e.target.value)}
          />
        </Field>

        <Field label="Gender">
          <Select
            value={draft.gender || undefined}
            onValueChange={(v) => update("gender", v ?? "")}
          >
            <SelectTrigger className={DRAWER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="non_binary">Non-binary</SelectItem>
              <SelectItem value="prefer_not">Prefer Not to Say</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Referred By">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Search by Referrals"
            value={draft.referredBy}
            onChange={(e) => update("referredBy", e.target.value)}
          />
        </Field>

        <Field label="Tag">
          <Input
            className={DRAWER_FIELD_CLASS}
            placeholder="Filter by Tag"
            value={draft.tag}
            onChange={(e) => update("tag", e.target.value)}
          />
        </Field>
      </div>
    </OptionsFilterDrawer>
  );
}
