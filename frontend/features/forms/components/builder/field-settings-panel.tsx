"use client";

import { useEffect, useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  ColumnCount,
  ColumnHorizontalAlign,
  ColumnVerticalAlign,
  FieldStyle,
  FormField,
  FormSettings,
  FormStatus,
} from "@/features/forms/types";
import { useFormFieldTypeMap } from "@/features/forms/hooks/use-form-metadata";
import {
  COLUMN_COUNT_OPTIONS,
  getFieldTypeLabel,
  resizeFormFieldColumns,
} from "@/features/forms/utils/field-defaults.util";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingSelect } from "@/features/forms/components/builder/settings-controls/setting-select";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";
import { ColorInput } from "@/features/forms/components/builder/settings-controls/color-input";
import { OptionsEditor } from "@/features/forms/components/builder/settings-controls/options-editor";
import { ColumnsFieldEditor } from "@/features/forms/components/builder/settings-controls/columns-field-editor";
import { FieldValidationSettings } from "@/features/forms/components/builder/field-validation-settings";
import { FormInfoSection } from "@/features/forms/components/builder/form-settings/form-info-section";
import { SubmitButtonSection } from "@/features/forms/components/builder/form-settings/submit-button-section";
import { AfterSubmitSection } from "@/features/forms/components/builder/form-settings/after-submit-section";
import { FormStylingSection } from "@/features/forms/components/builder/form-settings/form-styling-section";
import { MultiStepSection } from "@/features/forms/components/builder/form-settings/multi-step-section";
import { ShareFormSection } from "@/features/forms/components/builder/form-settings/share-form-section";
import { FormFileUploadControl } from "@/features/forms/components/form-file-upload-control";
import { FORM_IMAGE_ACCEPT } from "@/features/forms/utils/form-upload.util";
import { parseFieldWidth } from "@/features/forms/utils/field-style.util";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  FORMS_BUILDER_EMPTY_HINT_CLASS,
  FORMS_BUILDER_SETTINGS_BODY_CLASS,
  FORMS_BUILDER_SETTINGS_CLASS,
  FORMS_BUILDER_SETTINGS_FOOTER_CLASS,
  FORMS_BUILDER_SETTINGS_HEADER_CLASS,
  FORMS_BUILDER_SETTINGS_STACK_CLASS,
  FORMS_BUILDER_SETTINGS_TAB_CLASS,
  FORMS_BUILDER_SETTINGS_TABS_CLASS,
  FORMS_BUILDER_SETTINGS_TITLE_CLASS,
} from "@/lib/design/forms-builder-tokens";
import { SETTINGS_FORM_DISCARD_BUTTON_CLASS } from "@/lib/design/settings-form-tokens";

interface FieldSettingsPanelProps {
  selectedField: FormField | null;
  fields: FormField[];
  settings: FormSettings;
  formId?: string | null;
  formStatus?: FormStatus;
  formName?: string;
  onOpenShareDialog?: () => void;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onRemoveField?: (fieldId: string) => void;
  onUpdateSettings: (patch: Partial<FormSettings>) => void;
  onClose?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  className?: string;
}

const WIDTH_OPTIONS = [
  { value: "100", label: "100%" },
  { value: "75", label: "75%" },
  { value: "67", label: "67%" },
  { value: "50", label: "50%" },
  { value: "33", label: "33%" },
  { value: "25", label: "25%" },
];

const LABEL_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "left", label: "Left" },
  { value: "hidden", label: "Hidden" },
];

const LABEL_SIZE_OPTIONS = [
  { value: "xs", label: "Extra small" },
  { value: "sm", label: "Small" },
  { value: "base", label: "Base" },
  { value: "lg", label: "Large" },
];

const INPUT_SIZE_OPTIONS = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

const RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "full", label: "Full" },
];

const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const RATING_STYLE_OPTIONS = [
  { value: "stars", label: "Stars" },
  { value: "hearts", label: "Hearts" },
  { value: "thumbs", label: "Thumbs" },
  { value: "numbers", label: "Numbers" },
];

const HEADING_LEVEL_OPTIONS = [
  { value: "1", label: "H1" },
  { value: "2", label: "H2" },
  { value: "3", label: "H3" },
  { value: "4", label: "H4" },
];

const COLUMN_VERTICAL_ALIGN_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "stretch", label: "Stretch" },
];

const COLUMN_HORIZONTAL_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

function updateStyle(
  field: FormField,
  onUpdate: (patch: Partial<FormField>) => void,
  patch: Partial<FieldStyle>,
) {
  onUpdate({ style: { ...field.style, ...patch } });
}

function FieldEditor({
  field,
  onUpdate,
  showValidation = false,
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  showValidation?: boolean;
}) {
  const { byKey } = useFormFieldTypeMap({ status: "implemented" });
  const meta = byKey.get(field.type);
  const isLayout = meta?.role === "layout";
  const hasOptions = meta?.supportsOptions ?? false;
  const skipInputStyle = meta ? !meta.supportsInputStyle : false;
  const skipValidation = meta ? !meta.supportsValidation : false;
  const skipLabelStyle = meta ? !meta.supportsLabelStyle : false;
  const supportsLabel = meta?.supportsLabel ?? !isLayout;

  const [paymentAmountDraft, setPaymentAmountDraft] = useState(() =>
    typeof field.amount === "number" && Number.isFinite(field.amount)
      ? String(field.amount)
      : "20",
  );

  useEffect(() => {
    setPaymentAmountDraft(
      typeof field.amount === "number" && Number.isFinite(field.amount)
        ? String(field.amount)
        : "20",
    );
  }, [field.id]);

  const commitPaymentAmount = () => {
    const next = Number(paymentAmountDraft);
    if (!Number.isFinite(next) || next <= 0) {
      setPaymentAmountDraft("20");
      onUpdate({ amount: 20 });
      return;
    }
    const normalized = Math.round(next * 100) / 100;
    setPaymentAmountDraft(String(normalized));
    onUpdate({ amount: normalized });
  };

  const widthValue = String(
    field.style?.width === "half"
      ? 50
      : field.style?.width === "full"
        ? 100
        : parseFieldWidth(field.style?.width),
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {getFieldTypeLabel(field.type)}
      </p>

      <Accordion key={field.id} defaultValue={["General"]}>
      <SectionHeader title="General">
        {supportsLabel ? (
          <>
            <SettingRow label="Label">
              <SettingInput
                value={field.label}
                onChange={(value) => onUpdate({ label: value })}
              />
            </SettingRow>
            <SettingRow label="Field name">
              <SettingInput
                value={field.name}
                onChange={(value) => onUpdate({ name: value })}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "heading" || field.type === "paragraph" ? (
          <SettingRow label="Content">
            <SettingInput
              value={field.content ?? ""}
              onChange={(value) => onUpdate({ content: value })}
              multiline
              rows={field.type === "paragraph" ? 4 : 2}
            />
          </SettingRow>
        ) : null}

        {field.type === "heading" ? (
          <SettingRow label="Level">
            <SettingSelect
              value={String(field.level ?? 2)}
              onChange={(value) =>
                onUpdate({ level: Number(value) as FormField["level"] })
              }
              options={HEADING_LEVEL_OPTIONS}
            />
          </SettingRow>
        ) : null}

        {field.type === "image" ? (
          <SettingRow label="Image">
            <FormFileUploadControl
              variant="image"
              accept={FORM_IMAGE_ACCEPT}
              maxSizeMb={5}
              value={field.fileAssetId ?? ""}
              onChange={(fileAssetId) =>
                onUpdate({ fileAssetId, src: undefined })
              }
              onClear={() => onUpdate({ fileAssetId: undefined, src: undefined })}
            />
          </SettingRow>
        ) : null}

        {field.type === "spacer" ? (
          <SettingRow label="Height (px)">
            <SettingInput
              type="number"
              value={field.spacerHeight ?? 24}
              onChange={(value) => onUpdate({ spacerHeight: Number(value) || 24 })}
            />
          </SettingRow>
        ) : null}

        {field.type === "collect_payment" ? (
          <>
            <SettingRow label="Amount">
              <SettingInput
                type="number"
                min={0.01}
                step="0.01"
                value={paymentAmountDraft}
                onChange={(value) => {
                  setPaymentAmountDraft(value);
                  if (value.trim() === "") return;
                  const next = Number(value);
                  if (Number.isFinite(next) && next > 0) {
                    onUpdate({ amount: next });
                  }
                }}
                onBlur={commitPaymentAmount}
              />
            </SettingRow>
            <SettingRow label="Currency">
              <SettingInput
                value={field.currency ?? "USD"}
                onChange={(value) =>
                  onUpdate({
                    currency: value.trim().toUpperCase().slice(0, 3) || "USD",
                  })
                }
              />
            </SettingRow>
            <SettingRow label="Stripe mode">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    (field.stripePaymentsMode ?? "test") === "test"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                  onClick={() => onUpdate({ stripePaymentsMode: "test" })}
                >
                  Test
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    field.stripePaymentsMode === "live"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                  onClick={() => onUpdate({ stripePaymentsMode: "live" })}
                >
                  Live
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Uses this field&apos;s mode only — not the business Payments
                Live/Test setting.
              </p>
            </SettingRow>
            <SettingRow label="Help text">
              <SettingInput
                value={field.helpText ?? ""}
                onChange={(value) => onUpdate({ helpText: value })}
                multiline
                rows={2}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "file" ? (
          <>
            <SettingRow label="Accepted types">
              <SettingInput
                value={field.accept ?? "*/*"}
                onChange={(value) => onUpdate({ accept: value })}
              />
            </SettingRow>
            <SettingRow label="Max files">
              <SettingInput
                type="number"
                value={field.maxFiles ?? 1}
                onChange={(value) => onUpdate({ maxFiles: Number(value) || 1 })}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "rating" ? (
          <>
            <SettingRow label="Max stars">
              <SettingInput
                type="number"
                value={field.maxStars ?? 5}
                onChange={(value) => onUpdate({ maxStars: Number(value) || 5 })}
              />
            </SettingRow>
            <SettingRow label="Style">
              <SettingSelect
                value={field.ratingStyle ?? "stars"}
                onChange={(value) =>
                  onUpdate({ ratingStyle: value as FormField["ratingStyle"] })
                }
                options={RATING_STYLE_OPTIONS}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "range" ? (
          <>
            <SettingRow label="Min">
              <SettingInput
                type="number"
                value={field.validation?.min ?? 0}
                onChange={(value) =>
                  onUpdate({
                    validation: { ...field.validation, min: Number(value) },
                  })
                }
              />
            </SettingRow>
            <SettingRow label="Max">
              <SettingInput
                type="number"
                value={field.validation?.max ?? 100}
                onChange={(value) =>
                  onUpdate({
                    validation: { ...field.validation, max: Number(value) },
                  })
                }
              />
            </SettingRow>
            <SettingRow label="Step">
              <SettingInput
                type="number"
                value={field.step ?? 1}
                onChange={(value) => onUpdate({ step: Number(value) || 1 })}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "name" ? (
          <>
            <SettingToggle
              label="Show first name"
              checked={field.showFirstName !== false}
              onChange={(checked) => onUpdate({ showFirstName: checked })}
            />
            <SettingToggle
              label="Show middle name"
              checked={field.showMiddleName ?? false}
              onChange={(checked) => onUpdate({ showMiddleName: checked })}
            />
            <SettingToggle
              label="Show last name"
              checked={field.showLastName !== false}
              onChange={(checked) => onUpdate({ showLastName: checked })}
            />
          </>
        ) : null}

        {field.type === "columns" ? (
          <>
            <SettingRow label="Column count">
              <SettingSelect
                value={String(field.columnCount ?? field.columns?.length ?? 2)}
                onChange={(value) => {
                  const count = Number(value) as ColumnCount;
                  onUpdate({
                    columnCount: count,
                    columns: resizeFormFieldColumns(field.columns, count),
                  });
                }}
                options={COLUMN_COUNT_OPTIONS.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
              />
            </SettingRow>
            <SettingRow label="Vertical align">
              <SettingSelect
                value={field.columnVerticalAlign ?? "top"}
                onChange={(value) =>
                  onUpdate({ columnVerticalAlign: value as ColumnVerticalAlign })
                }
                options={COLUMN_VERTICAL_ALIGN_OPTIONS}
              />
            </SettingRow>
            <SettingRow label="Horizontal align">
              <SettingSelect
                value={field.columnHorizontalAlign ?? "left"}
                onChange={(value) =>
                  onUpdate({ columnHorizontalAlign: value as ColumnHorizontalAlign })
                }
                options={COLUMN_HORIZONTAL_ALIGN_OPTIONS}
              />
            </SettingRow>
            <ColumnsFieldEditor
              columns={field.columns ?? []}
              onChange={(columns) => onUpdate({ columns })}
            />
          </>
        ) : null}

        {field.type === "hidden" ? (
          <SettingRow label="Hidden value">
            <SettingInput
              value={field.hiddenValue ?? ""}
              onChange={(value) => onUpdate({ hiddenValue: value })}
            />
          </SettingRow>
        ) : null}

        {!isLayout && field.type !== "captcha" && field.type !== "hidden" ? (
          <>
            <SettingRow label="Placeholder">
              <SettingInput
                value={field.placeholder ?? ""}
                onChange={(value) => onUpdate({ placeholder: value })}
              />
            </SettingRow>
            <SettingRow label="Help text">
              <SettingInput
                value={field.helpText ?? ""}
                onChange={(value) => onUpdate({ helpText: value })}
              />
            </SettingRow>
            <SettingRow label="Default value">
              <SettingInput
                value={field.defaultValue ?? ""}
                onChange={(value) => onUpdate({ defaultValue: value })}
              />
            </SettingRow>
          </>
        ) : null}

        {field.type === "textarea" ? (
          <SettingRow label="Rows">
            <SettingInput
              type="number"
              value={field.rows ?? 4}
              onChange={(value) => onUpdate({ rows: Number(value) || 4 })}
            />
          </SettingRow>
        ) : null}
      </SectionHeader>

      {hasOptions ? (
        <SectionHeader title="Options">
          <OptionsEditor
            options={field.options ?? []}
            onChange={(options) => onUpdate({ options })}
          />
        </SectionHeader>
      ) : null}

      {!skipValidation && showValidation ? (
        <SectionHeader title="Validation">
          <FieldValidationSettings field={field} onUpdate={onUpdate} />
        </SectionHeader>
      ) : null}

      {!skipLabelStyle ? (
        <SectionHeader title="Label Style">
          <SettingRow label="Position">
            <SettingSelect
              value={field.style?.labelPosition ?? "top"}
              onChange={(value) =>
                updateStyle(field, onUpdate, {
                  labelPosition: value as FieldStyle["labelPosition"],
                })
              }
              options={LABEL_POSITION_OPTIONS}
            />
          </SettingRow>
          <SettingRow label="Size">
            <SettingSelect
              value={field.style?.labelSize ?? "sm"}
              onChange={(value) =>
                updateStyle(field, onUpdate, {
                  labelSize: value as FieldStyle["labelSize"],
                })
              }
              options={LABEL_SIZE_OPTIONS}
            />
          </SettingRow>
          <SettingToggle
            label="Bold"
            checked={field.style?.labelBold ?? false}
            onChange={(checked) => updateStyle(field, onUpdate, { labelBold: checked })}
          />
          <SettingRow label="Color">
            <ColorInput
              value={field.style?.labelColor}
              onChange={(value) => updateStyle(field, onUpdate, { labelColor: value })}
            />
          </SettingRow>
        </SectionHeader>
      ) : null}

      {!skipInputStyle ? (
        <SectionHeader title="Input Style">
          <SettingRow label="Size">
            <SettingSelect
              value={field.style?.inputSize ?? "md"}
              onChange={(value) =>
                updateStyle(field, onUpdate, {
                  inputSize: value as FieldStyle["inputSize"],
                })
              }
              options={INPUT_SIZE_OPTIONS}
            />
          </SettingRow>
          <SettingRow label="Border radius">
            <SettingSelect
              value={field.style?.inputBorderRadius ?? "md"}
              onChange={(value) =>
                updateStyle(field, onUpdate, {
                  inputBorderRadius: value as FieldStyle["inputBorderRadius"],
                })
              }
              options={RADIUS_OPTIONS}
            />
          </SettingRow>
          <SettingRow label="Background">
            <ColorInput
              value={field.style?.inputBgColor}
              onChange={(value) => updateStyle(field, onUpdate, { inputBgColor: value })}
            />
          </SettingRow>
          <SettingRow label="Text color">
            <ColorInput
              value={field.style?.inputTextColor}
              onChange={(value) => updateStyle(field, onUpdate, { inputTextColor: value })}
            />
          </SettingRow>
          <SettingRow label="Border color">
            <ColorInput
              value={field.style?.inputBorderColor}
              onChange={(value) =>
                updateStyle(field, onUpdate, { inputBorderColor: value })
              }
            />
          </SettingRow>
        </SectionHeader>
      ) : null}

      <SectionHeader title="Layout">
        <SettingRow label="Width">
          <SettingSelect
            value={widthValue}
            onChange={(value) =>
              updateStyle(field, onUpdate, {
                width: parseFieldWidth(value),
              })
            }
            options={WIDTH_OPTIONS}
          />
        </SettingRow>
        <SettingRow label="Margin bottom (px)">
          <SettingInput
            type="number"
            value={field.style?.marginBottom ?? 16}
            onChange={(value) =>
              updateStyle(field, onUpdate, { marginBottom: Number(value) || 0 })
            }
          />
        </SettingRow>
        <SettingRow label="Text align">
          <SettingSelect
            value={field.style?.textAlign ?? "left"}
            onChange={(value) =>
              updateStyle(field, onUpdate, {
                textAlign: value as FieldStyle["textAlign"],
              })
            }
            options={TEXT_ALIGN_OPTIONS}
          />
        </SettingRow>
      </SectionHeader>
      </Accordion>
    </div>
  );
}

type SettingsTab = "general" | "field" | "validation" | "form";

export function FieldSettingsPanel({
  selectedField,
  fields,
  settings,
  formId = null,
  formStatus = "draft",
  onOpenShareDialog,
  onUpdateField,
  onUpdateSettings,
  onClose,
  onSave,
  onDiscard,
  isDirty = false,
  isSaving = false,
  className,
}: FieldSettingsPanelProps) {
  const { byKey } = useFormFieldTypeMap({ status: "implemented" });
  const skipValidation = selectedField
    ? (byKey.get(selectedField.type)?.supportsValidation === false)
    : false;
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <aside className={cn(FORMS_BUILDER_SETTINGS_CLASS, className)}>
      <div className={FORMS_BUILDER_SETTINGS_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-[var(--spacing-2)]">
          <SlidersHorizontal className="size-4 text-violet-primary-normal" />
          <h2 className={FORMS_BUILDER_SETTINGS_TITLE_CLASS}>Settings</h2>
        </div>
        {onClose ? (
          <IconButton size="header" aria-label="Deselect field" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as SettingsTab)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden gap-0"
      >
        <TabsList variant="line" className={FORMS_BUILDER_SETTINGS_TABS_CLASS}>
          <TabsTrigger value="general" className={FORMS_BUILDER_SETTINGS_TAB_CLASS}>
            General
          </TabsTrigger>
          <TabsTrigger value="field" className={FORMS_BUILDER_SETTINGS_TAB_CLASS}>
            Field
          </TabsTrigger>
          <TabsTrigger value="validation" className={FORMS_BUILDER_SETTINGS_TAB_CLASS}>
            Validation
          </TabsTrigger>
          <TabsTrigger value="form" className={FORMS_BUILDER_SETTINGS_TAB_CLASS}>
            Form
          </TabsTrigger>
        </TabsList>

        <div className={FORMS_BUILDER_SETTINGS_BODY_CLASS}>
          <TabsContent value="general" className="mt-0">
            <FormInfoSection settings={settings} onUpdate={onUpdateSettings} />
          </TabsContent>

          <TabsContent value="field" className="mt-0">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onUpdate={(patch) => onUpdateField(selectedField.id, patch)}
              />
            ) : (
              <p className={FORMS_BUILDER_EMPTY_HINT_CLASS}>
                Select a field on the canvas to edit its settings.
              </p>
            )}
          </TabsContent>

          <TabsContent value="validation" className="mt-0">
            {!selectedField ? (
              <p className={FORMS_BUILDER_EMPTY_HINT_CLASS}>
                Select a field on the canvas to edit validation.
              </p>
            ) : skipValidation ? (
              <p className={FORMS_BUILDER_EMPTY_HINT_CLASS}>
                This field does not use validation.
              </p>
            ) : (
              <FieldValidationSettings
                field={selectedField}
                onUpdate={(patch) => onUpdateField(selectedField.id, patch)}
              />
            )}
          </TabsContent>

          <TabsContent value="form" className="mt-0">
            <div className={FORMS_BUILDER_SETTINGS_STACK_CLASS}>
              <SettingRow label="Confirmation Message">
                <SettingInput
                  value={settings.successMessage}
                  onChange={(value) => onUpdateSettings({ successMessage: value })}
                  multiline
                  rows={3}
                />
              </SettingRow>
              <SettingRow label="Submit Button Text">
                <SettingInput
                  value={settings.submitButtonLabel}
                  onChange={(value) =>
                    onUpdateSettings({ submitButtonLabel: value })
                  }
                />
              </SettingRow>
              <Accordion defaultValue={["Share & Embed"]}>
                <ShareFormSection
                  formId={formId}
                  status={formStatus}
                  onOpenShareDialog={onOpenShareDialog ?? (() => undefined)}
                />
                <SubmitButtonSection
                  settings={settings}
                  onUpdate={onUpdateSettings}
                  includeLabel={false}
                />
                <AfterSubmitSection
                  settings={settings}
                  onUpdate={onUpdateSettings}
                  includeSuccessMessage={false}
                />
                <FormStylingSection settings={settings} onUpdate={onUpdateSettings} />
                <MultiStepSection
                  settings={settings}
                  fields={fields}
                  onUpdate={onUpdateSettings}
                />
              </Accordion>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {onSave && onDiscard ? (
        <div className={FORMS_BUILDER_SETTINGS_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={SETTINGS_FORM_DISCARD_BUTTON_CLASS}
            onClick={onDiscard}
            disabled={isSaving || !isDirty}
          >
            Discard
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={onSave}
            disabled={isSaving || (!isDirty && Boolean(formId))}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
