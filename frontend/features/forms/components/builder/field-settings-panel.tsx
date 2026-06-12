"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { FieldStyle, FormField, FormSettings } from "@/features/forms/types";
import {
  CHOICE_FIELD_TYPES,
  getFieldTypeLabel,
  LAYOUT_FIELD_TYPES,
} from "@/features/forms/utils/field-defaults.util";
import { SectionHeader } from "@/features/forms/components/builder/settings-controls/section-header";
import { SettingInput } from "@/features/forms/components/builder/settings-controls/setting-input";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingSelect } from "@/features/forms/components/builder/settings-controls/setting-select";
import { SettingToggle } from "@/features/forms/components/builder/settings-controls/setting-toggle";
import { ColorInput } from "@/features/forms/components/builder/settings-controls/color-input";
import { OptionsEditor } from "@/features/forms/components/builder/settings-controls/options-editor";
import { FormInfoSection } from "@/features/forms/components/builder/form-settings/form-info-section";
import { SubmitButtonSection } from "@/features/forms/components/builder/form-settings/submit-button-section";
import { AfterSubmitSection } from "@/features/forms/components/builder/form-settings/after-submit-section";
import { FormStylingSection } from "@/features/forms/components/builder/form-settings/form-styling-section";
import { MultiStepSection } from "@/features/forms/components/builder/form-settings/multi-step-section";

interface FieldSettingsPanelProps {
  selectedField: FormField | null;
  fields: FormField[];
  settings: FormSettings;
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void;
  onUpdateSettings: (patch: Partial<FormSettings>) => void;
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
}: {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const isLayout = LAYOUT_FIELD_TYPES.includes(field.type);
  const hasOptions = CHOICE_FIELD_TYPES.includes(field.type);
  const skipInputStyle = [
    ...LAYOUT_FIELD_TYPES,
    "rating",
    "range",
    "signature",
    "captcha",
    "divider",
    "spacer",
  ].includes(field.type);
  const skipValidation = isLayout || field.type === "hidden";
  const skipLabelStyle = isLayout;

  const widthValue = String(
    field.style?.width === "half"
      ? 50
      : field.style?.width === "full"
        ? 100
        : (field.style?.width ?? 100),
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {getFieldTypeLabel(field.type)}
      </p>

      <Accordion key={field.id} defaultValue={["General"]}>
      <SectionHeader title="General">
        {!isLayout && field.type !== "divider" && field.type !== "spacer" ? (
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
          <SettingRow label="Image URL">
            <SettingInput
              value={field.src ?? ""}
              onChange={(value) => onUpdate({ src: value })}
              type="url"
              placeholder="https://…"
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
          <SettingRow label="Column count">
            <SettingSelect
              value={String(field.columnCount ?? 2)}
              onChange={(value) => {
                const count = Number(value) as 2 | 3;
                const columns = field.columns ?? [[], []];
                const next =
                  count === 3 && columns.length < 3
                    ? [...columns, []]
                    : count === 2
                      ? columns.slice(0, 2)
                      : columns;
                onUpdate({ columnCount: count, columns: next });
              }}
              options={[
                { value: "2", label: "2 columns" },
                { value: "3", label: "3 columns" },
              ]}
            />
          </SettingRow>
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

      {!skipValidation ? (
        <SectionHeader title="Validation">
          <SettingToggle
            label="Required"
            checked={field.validation?.required ?? false}
            onChange={(checked) =>
              onUpdate({
                validation: { ...field.validation, required: checked },
              })
            }
          />
          <SettingRow label="Min length">
            <SettingInput
              type="number"
              value={field.validation?.minLength ?? ""}
              onChange={(value) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    minLength: value ? Number(value) : undefined,
                  },
                })
              }
            />
          </SettingRow>
          <SettingRow label="Max length">
            <SettingInput
              type="number"
              value={field.validation?.maxLength ?? ""}
              onChange={(value) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    maxLength: value ? Number(value) : undefined,
                  },
                })
              }
            />
          </SettingRow>
          <SettingRow label="Pattern (regex)">
            <SettingInput
              value={field.validation?.pattern ?? ""}
              onChange={(value) =>
                onUpdate({
                  validation: { ...field.validation, pattern: value || undefined },
                })
              }
            />
          </SettingRow>
          <SettingRow label="Pattern message">
            <SettingInput
              value={field.validation?.patternMessage ?? ""}
              onChange={(value) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    patternMessage: value || undefined,
                  },
                })
              }
            />
          </SettingRow>
          <SettingRow label="Custom message">
            <SettingInput
              value={field.validation?.customMessage ?? ""}
              onChange={(value) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    customMessage: value || undefined,
                  },
                })
              }
            />
          </SettingRow>
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
                width: Number(value) as FieldStyle["width"],
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

type SettingsTab = "field" | "form";

export function FieldSettingsPanel({
  selectedField,
  fields,
  settings,
  onUpdateField,
  onUpdateSettings,
  className,
}: FieldSettingsPanelProps) {
  const selectedFieldId = selectedField?.id ?? null;
  const [tabOverride, setTabOverride] = useState<{
    fieldId: string | null;
    tab: SettingsTab;
  } | null>(null);

  const activeTab: SettingsTab =
    tabOverride?.fieldId === selectedFieldId
      ? tabOverride.tab
      : selectedField
        ? "field"
        : "form";

  const handleTabChange = (value: string) => {
    setTabOverride({
      fieldId: selectedFieldId,
      tab: value as SettingsTab,
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-l bg-muted/20",
        className,
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col overflow-hidden"
      >
        <div className="shrink-0 border-b py-2 pl-2 pr-[var(--page-padding-x)]">
          <TabsList className="w-full">
            <TabsTrigger value="field" className="flex-1 px-2 text-xs">
              Field Settings
            </TabsTrigger>
            <TabsTrigger value="form" className="flex-1 px-2 text-xs">
              Form Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 pl-2 pr-[var(--page-padding-x)]">
          <TabsContent value="field" className="mt-0">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onUpdate={(patch) => onUpdateField(selectedField.id, patch)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a field on the canvas to edit its settings.
              </p>
            )}
          </TabsContent>

          <TabsContent value="form" className="mt-0">
            <Accordion defaultValue={["Form Info"]}>
              <FormInfoSection settings={settings} onUpdate={onUpdateSettings} />
              <SubmitButtonSection settings={settings} onUpdate={onUpdateSettings} />
              <AfterSubmitSection settings={settings} onUpdate={onUpdateSettings} />
              <FormStylingSection settings={settings} onUpdate={onUpdateSettings} />
              <MultiStepSection
                settings={settings}
                fields={fields}
                onUpdate={onUpdateSettings}
              />
            </Accordion>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
