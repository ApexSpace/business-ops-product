"use client";

import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";

const HEADER_TYPE_OPTIONS = [
  { value: "none", label: "No header" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
];

export interface WhatsAppTemplateHeaderFieldsProps {
  control: Control<WhatsAppTemplateFormValues>;
  headerType: WhatsAppTemplateFormValues["headerType"];
  onHeaderTypeChange: (value: WhatsAppTemplateFormValues["headerType"]) => void;
  headerFile: File | null;
  onHeaderFileChange: (file: File | null) => void;
  readOnlyMedia?: boolean;
  disableTypeChange?: boolean;
}

export function WhatsAppTemplateHeaderFields({
  control,
  headerType,
  onHeaderTypeChange,
  headerFile,
  onHeaderFileChange,
  readOnlyMedia = false,
  disableTypeChange = false,
}: WhatsAppTemplateHeaderFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Header</label>
        <SearchableSelect
          items={HEADER_TYPE_OPTIONS}
          value={headerType}
          onValueChange={(value) =>
            onHeaderTypeChange(
              (value ?? "none") as WhatsAppTemplateFormValues["headerType"],
            )
          }
          searchable={false}
          disabled={disableTypeChange}
          triggerClassName="w-full"
        />
      </div>

      {headerType === "text" ? (
        <TextField
          control={control}
          name="headerText"
          label="Header text"
          placeholder="Optional header line"
        />
      ) : null}

      {headerType === "image" ||
      headerType === "video" ||
      headerType === "document" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Header sample file
          </label>
          {readOnlyMedia ? (
            <p className="text-sm text-muted-foreground">
              Media headers cannot be changed on edit. Duplicate the template to
              upload a new sample.
            </p>
          ) : (
            <input
              type="file"
              accept={
                headerType === "image"
                  ? "image/jpeg,image/png,image/webp"
                  : headerType === "video"
                    ? "video/mp4,video/3gpp"
                    : "application/pdf"
              }
              onChange={(event) =>
                onHeaderFileChange(event.target.files?.[0] ?? null)
              }
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          )}
          {headerFile ? (
            <p className="text-xs text-muted-foreground">
              Selected: {headerFile.name}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
