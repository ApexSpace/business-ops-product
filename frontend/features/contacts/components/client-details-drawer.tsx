"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Info,
  Loader2,
  MapPin,
  Share2,
  SlidersHorizontal,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { PhoneField } from "@/components/forms/phone-field";
import { TextField } from "@/components/forms/text-field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContact, updateContact } from "@/features/contacts/api/contacts.api";
import {
  contactProfileDefaultValues,
  contactProfileSchema,
  profileFormToApiBody,
  type ContactProfileFormValues,
} from "@/features/contacts/schemas/contact-profile";
import {
  ContactAddNoteAction,
} from "@/features/contacts/components/contact-detail-field";
import {
  CONTACTS_ACCORDION_ICON_CLASS,
  CONTACTS_ACCORDION_LIST_CLASS,
  CONTACTS_ACCORDION_ROW_CLASS,
  CONTACTS_AVATAR_RING_CLASS,
  CONTACTS_AVATAR_UPLOAD_BTN_CLASS,
  CONTACTS_DRAWER_BODY_INSET_CLASS,
  CONTACTS_DRAWER_FIELD_CLASS,
  CONTACTS_DRAWER_FOOTER_CLASS,
  CONTACTS_DRAWER_FOOTER_INNER_CLASS,
  CONTACTS_DRAWER_FORM_FIELDS_CLASS,
  CONTACTS_DRAWER_MOBILE_SHELL_CLASS,
  CONTACTS_DRAWER_SHELL_CLASS,
  CONTACTS_DRAWER_SHELL_HEADER_CLASS,
  CONTACTS_DRAWER_SPINE_LABELS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { mapApiFieldErrorsToForm } from "@/lib/forms/map-api-field-errors";
import { ApiClientError } from "@/lib/api/errors";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { queryKeys } from "@/lib/query/keys";
import { buildDisplayName } from "@/features/settings/schemas/business-profile";
import {
  StorageUploadError,
  useFileDownloadUrl,
  useStorageUpload,
  validateFileForUpload,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

type AccordionId =
  | "social"
  | "additional"
  | "address"
  | "messaging"
  | "booking";

export interface ClientDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AccordionRow({
  id,
  label,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: AccordionId;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  open: boolean;
  onToggle: (id: AccordionId) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        className={CONTACTS_ACCORDION_ROW_CLASS}
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <Icon className={CONTACTS_ACCORDION_ICON_CLASS} strokeWidth={1.75} />
          <span className="truncate">{label}</span>
        </span>
        {open ? (
          <NavArrowIcon direction="down" size="sm" className="text-[var(--drawer-text-secondary)]" />
        ) : (
          <NavArrowIcon direction="right" size="sm" className="text-[var(--drawer-text-secondary)]" />
        )}
      </button>
      {open && children ? (
        <div className="mt-2 space-y-3 px-1 pb-2">{children}</div>
      ) : null}
    </div>
  );
}

function ClientAvatarUpload({
  value,
  onChange,
  displayName,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  displayName: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [, bump] = useState(0);
  const { uploadFile, isUploading } = useStorageUpload();
  const { data: downloadData } = useFileDownloadUrl(value, { enabled: !!value });

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  const previewUrl =
    downloadData?.downloadUrl ??
    localPreviewRef.current ??
    null;

  const processFile = async (file: File) => {
    try {
      validateFileForUpload({
        file,
        maxSizeMb: 0.5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
      localPreviewRef.current = URL.createObjectURL(file);
      bump((v) => v + 1);
      const uploaded = await uploadFile({
        file,
        visibility: "PRIVATE",
        maxSizeMb: 0.5,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      onChange(uploaded.id);
    } catch (err) {
      toast.error(
        err instanceof StorageUploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed",
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 border-b border-[var(--drawer-header-border)] px-6 pb-4 pt-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void processFile(file);
        }}
      />
      <div className={CONTACTS_AVATAR_RING_CLASS}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-10 text-[var(--drawer-text-secondary)]" aria-hidden />
        )}
        <button
          type="button"
          aria-label="Upload profile photo"
          disabled={disabled || isUploading}
          className={CONTACTS_AVATAR_UPLOAD_BTN_CLASS}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" strokeWidth={2} />
          )}
        </button>
      </div>
      {displayName ? (
        <span className="sr-only">{displayName}</span>
      ) : null}
    </div>
  );
}

/** Figma Client Details create sidebar — spine, avatar, fields, accordion, Add. */
export function ClientDetailsDrawer({
  open,
  onOpenChange,
  onSuccess,
}: ClientDetailsDrawerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<AccordionId | null>("social");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  const form = useForm<ContactProfileFormValues>({
    resolver: zodResolver(contactProfileSchema),
    defaultValues: contactProfileDefaultValues,
  });

  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const displayName = form.watch("displayName");
  const avatarAssetId = form.watch("avatarAssetId");

  useEffect(() => {
    if (!open) return;
    form.reset(contactProfileDefaultValues);
    setExpanded("social");
    setNoteOpen(false);
    setNoteDraft("");
    setFacebook("");
    setInstagram("");
  }, [open, form]);

  useEffect(() => {
    if (!open) return;
    const computed = buildDisplayName(firstName ?? "", lastName ?? "");
    if (computed && computed !== displayName) {
      form.setValue("displayName", computed, { shouldDirty: true });
    }
  }, [firstName, lastName, displayName, form, open]);

  const mutation = useMutation({
    mutationFn: async (values: ContactProfileFormValues) => {
      const body = profileFormToApiBody(values) as Record<string, unknown>;
      const contact = await createContact(body);
      const noteParts: string[] = [];
      if (noteDraft.trim()) noteParts.push(noteDraft.trim());
      if (facebook.trim()) noteParts.push(`Facebook: ${facebook.trim()}`);
      if (instagram.trim()) noteParts.push(`Instagram: ${instagram.trim()}`);
      if (noteParts.length > 0) {
        await updateContact(contact.id, { clientNotes: noteParts.join("\n") });
      }
      return contact;
    },
    onSuccess: (_data, values) => {
      const nextAssetId = values.avatarAssetId?.trim() || "";
      if (nextAssetId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.file(nextAssetId),
        });
      }
      toast.success("Contact created");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (!mapApiFieldErrorsToForm(err, form.setError)) {
        const hint =
          err instanceof ApiClientError && err.requestId
            ? `${err.message} (${err.requestId})`
            : err.message;
        toast.error(hint);
      }
    },
  });

  const toggle = (id: AccordionId) =>
    setExpanded((prev) => (prev === id ? null : id));

  const nameForAvatar =
    displayName?.trim() ||
    buildDisplayName(firstName ?? "", lastName ?? "") ||
    "Contact";

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      chrome={isMobile ? "mobile-brand" : "default"}
      spineLabel={
        isMobile ? undefined : CONTACTS_DRAWER_SPINE_LABELS.clientDetails
      }
      className={
        isMobile ? CONTACTS_DRAWER_MOBILE_SHELL_CLASS : CONTACTS_DRAWER_SHELL_CLASS
      }
      headerClassName={isMobile ? undefined : CONTACTS_DRAWER_SHELL_HEADER_CLASS}
      contentClassName="!px-0 !py-0"
      footerClassName={CONTACTS_DRAWER_FOOTER_CLASS}
      title={
        isMobile ? (
          "Client Details"
        ) : (
          <DrawerHeaderContent title="Client Details" />
        )
      }
      footer={
        <div className={CONTACTS_DRAWER_FOOTER_INNER_CLASS}>
          <DrawerPrimaryButton
            disabled={mutation.isPending}
            onClick={() => void form.handleSubmit((v) => mutation.mutate(v))()}
          >
            {mutation.isPending ? "Adding…" : "Add"}
          </DrawerPrimaryButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <ClientAvatarUpload
            value={avatarAssetId ?? ""}
            onChange={(id) =>
              form.setValue("avatarAssetId", id, { shouldDirty: true })
            }
            displayName={nameForAvatar}
            disabled={mutation.isPending}
          />

          <div className={cn(CONTACTS_DRAWER_BODY_INSET_CLASS, "pt-4")}>
            <div className={cn(CONTACTS_DRAWER_FORM_FIELDS_CLASS, "gap-6")}>
              <TextField
                control={form.control}
                name="firstName"
                label="First Name"
                placeholder="Enter first name"
                disabled={mutation.isPending}
              />
              <TextField
                control={form.control}
                name="lastName"
                label="Last Name"
                placeholder="Enter last name"
                disabled={mutation.isPending}
              />
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                placeholder="Enter email"
                disabled={mutation.isPending}
              />
              <PhoneField
                control={form.control}
                name="phone"
                label="Phone Number"
                placeholder="Enter phone number"
                disabled={mutation.isPending}
              />

              {noteOpen ? (
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[var(--drawer-text-body)]">
                    Note
                  </Label>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note about this client"
                    className={cn(CONTACTS_DRAWER_FIELD_CLASS, "min-h-20")}
                    disabled={mutation.isPending}
                  />
                </div>
              ) : (
                <ContactAddNoteAction
                  onClick={() => setNoteOpen(true)}
                  disabled={mutation.isPending}
                />
              )}
            </div>

            <div className={cn(CONTACTS_ACCORDION_LIST_CLASS, "mt-6")}>
              <AccordionRow
                id="social"
                label="Social media"
                icon={Share2}
                open={expanded === "social"}
                onToggle={toggle}
              >
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[var(--drawer-text-body)]">
                    Facebook
                  </Label>
                  <Input
                    className={CONTACTS_DRAWER_FIELD_CLASS}
                    placeholder="Enter facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    disabled={mutation.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[var(--drawer-text-body)]">
                    Instagram
                  </Label>
                  <Input
                    className={CONTACTS_DRAWER_FIELD_CLASS}
                    placeholder="Enter instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    disabled={mutation.isPending}
                  />
                </div>
              </AccordionRow>

              <AccordionRow
                id="additional"
                label="Additional details"
                icon={Info}
                open={expanded === "additional"}
                onToggle={toggle}
              >
                <TextField
                  control={form.control}
                  name="companyName"
                  label="Company"
                  placeholder="Enter company"
                  disabled={mutation.isPending}
                />
              </AccordionRow>

              <AccordionRow
                id="address"
                label="Address"
                icon={MapPin}
                open={expanded === "address"}
                onToggle={toggle}
              >
                <TextField
                  control={form.control}
                  name="address"
                  label="Street"
                  placeholder="Enter address"
                  disabled={mutation.isPending}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    control={form.control}
                    name="city"
                    label="City"
                    placeholder="City"
                    disabled={mutation.isPending}
                  />
                  <TextField
                    control={form.control}
                    name="state"
                    label="State"
                    placeholder="State"
                    disabled={mutation.isPending}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    control={form.control}
                    name="zip"
                    label="ZIP"
                    placeholder="ZIP"
                    disabled={mutation.isPending}
                  />
                  <TextField
                    control={form.control}
                    name="country"
                    label="Country"
                    placeholder="Country"
                    disabled={mutation.isPending}
                  />
                </div>
              </AccordionRow>

              <AccordionRow
                id="messaging"
                label="Messaging preferences"
                icon={SlidersHorizontal}
                open={expanded === "messaging"}
                onToggle={toggle}
              >
                <p className="text-[13px] text-muted-foreground">
                  Messaging preferences can be set after the client is created.
                </p>
              </AccordionRow>

              <AccordionRow
                id="booking"
                label="Online booking"
                icon={Globe}
                open={expanded === "booking"}
                onToggle={toggle}
              >
                <p className="text-[13px] text-muted-foreground">
                  Online booking settings can be managed from the client
                  profile.
                </p>
              </AccordionRow>
            </div>
          </div>
        </form>
      </Form>
    </DrawerShell>
  );
}
