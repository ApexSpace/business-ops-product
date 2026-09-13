"use client";

import { useDraggable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  AlignLeft,
  Calendar,
  CalendarClock,
  CheckSquare,
  CircleDot,
  Columns2,
  CreditCard,
  FileUp,
  Hash,
  Heading,
  Image,
  KeyRound,
  List,
  Loader2,
  Mail,
  Minus,
  PenLine,
  Phone,
  Shield,
  SlidersHorizontal,
  Space,
  Star,
  TextCursorInput,
  ToggleLeft,
  Type,
  User,
  Globe,
  EyeOff,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SearchInput } from "@/components/forms/search-input";
import {
  ENTITY_FILTER_PILL_ACTIVE_CLASS,
  ENTITY_FILTER_PILL_CLASS,
} from "@/lib/design/workspace-tokens";
import {
  FORMS_BUILDER_PALETTE_ASIDE_CLASS,
  FORMS_BUILDER_PALETTE_HEADER_CLASS,
  FORMS_BUILDER_PALETTE_ITEM_CLASS,
  FORMS_BUILDER_PALETTE_SCROLL_CLASS,
  FORMS_BUILDER_PALETTE_SECTION_TRIGGER_CLASS,
} from "@/lib/design/forms-builder-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { WORKSPACE_NAV_ICON_CLASS } from "@/lib/design/workspace-nav-tokens";
import { cn } from "@/lib/utils";
import type { FieldType } from "@/features/forms/types";
import { useFormFieldPalette } from "@/features/forms/hooks/use-form-metadata";
import type { ColumnAddContext } from "@/features/forms/utils/column-fields.util";

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  type: Type,
  mail: Mail,
  phone: Phone,
  hash: Hash,
  "key-round": KeyRound,
  "align-left": AlignLeft,
  list: List,
  "circle-dot": CircleDot,
  "check-square": CheckSquare,
  "toggle-left": ToggleLeft,
  calendar: Calendar,
  "calendar-clock": CalendarClock,
  "file-up": FileUp,
  "pen-line": PenLine,
  star: Star,
  "sliders-horizontal": SlidersHorizontal,
  "eye-off": EyeOff,
  shield: Shield,
  "credit-card": CreditCard,
  user: User,
  globe: Globe,
  heading: Heading,
  "text-cursor-input": TextCursorInput,
  minus: Minus,
  space: Space,
  image: Image,
  "columns-2": Columns2,
};

const DISALLOWED_IN_COLUMN_TYPES = new Set<FieldType>([
  "columns",
  "hidden",
  "captcha",
  "collect_payment",
]);

interface PaletteItemProps {
  type: FieldType;
  label: string;
  icon?: string;
  disabled?: boolean;
  onAddField: (type: FieldType) => void;
}

function PaletteItem({ type, label, icon, disabled, onAddField }: PaletteItemProps) {
  const Icon = (icon ? FIELD_ICONS[icon] : undefined) ?? Type;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, source: "palette" as const },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={() => onAddField(type)}
      className={cn(
        FORMS_BUILDER_PALETTE_ITEM_CLASS,
        isDragging && "opacity-50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className={cn(WORKSPACE_NAV_ICON_CLASS, "text-grey-tertiary-normal")} />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  columnAddContext?: ColumnAddContext | null;
  onTargetColumnChange?: (columnIndex: number) => void;
  className?: string;
}

export function FieldPalette({
  onAddField,
  columnAddContext = null,
  onTargetColumnChange,
  className,
}: FieldPaletteProps) {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("basic");
  const { data: palette = [], isLoading } = useFormFieldPalette({
    status: "implemented",
    search: search.trim() || undefined,
  });

  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return palette;

    return palette
      .map((category) => ({
        ...category,
        fields: category.fields.filter((field) =>
          field.label.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.fields.length > 0);
  }, [palette, search]);

  const effectiveOpenCategory = useMemo(() => {
    if (search.trim()) {
      return categories[0]?.key ?? null;
    }
    return openCategory;
  }, [search, categories, openCategory]);

  const handleAddField = (type: FieldType) => {
    if (columnAddContext && DISALLOWED_IN_COLUMN_TYPES.has(type)) return;
    onAddField(type);
  };

  return (
    <aside
      className={cn(FORMS_BUILDER_PALETTE_ASIDE_CLASS, className)}
    >
      <div className={FORMS_BUILDER_PALETTE_HEADER_CLASS}>
        <h2 className={SETTINGS_GROUP_TITLE_CLASS}>Fields</h2>
        <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
          {columnAddContext
            ? "Click or drag a field to add it to the selected column."
            : "Drag or click to add fields."}
        </p>

        {columnAddContext ? (
          <div className="space-y-[var(--spacing-2)]">
            <p className="text-[12px] font-medium leading-none text-[var(--drawer-text-secondary)]">
              Add to column
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: columnAddContext.columnCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onTargetColumnChange?.(index)}
                  className={
                    columnAddContext.targetColumnIndex === index
                      ? ENTITY_FILTER_PILL_ACTIVE_CLASS
                      : ENTITY_FILTER_PILL_CLASS
                  }
                >
                  Column {index + 1}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search fields…"
          />
        </div>
      </div>

      <div className={FORMS_BUILDER_PALETTE_SCROLL_CLASS}>
        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-4 text-sm text-[var(--drawer-text-secondary)]">
            <Loader2 className="size-4 animate-spin" />
            Loading field types…
          </div>
        ) : (
          <Accordion
            value={effectiveOpenCategory ? [effectiveOpenCategory] : []}
            onValueChange={(value) => setOpenCategory(value[0] ?? null)}
          >
            {categories.map((category) => (
              <AccordionItem key={category.key} value={category.key}>
                <AccordionTrigger className={FORMS_BUILDER_PALETTE_SECTION_TRIGGER_CLASS}>
                  {category.label}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-1.5">
                  <div className="flex flex-col">
                    {category.fields.map((field) => {
                      const type = field.key as FieldType;
                      const disabled =
                        !!columnAddContext && DISALLOWED_IN_COLUMN_TYPES.has(type);
                      return (
                        <PaletteItem
                          key={field.key}
                          type={type}
                          label={field.label}
                          icon={field.icon}
                          disabled={disabled}
                          onAddField={handleAddField}
                        />
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {!isLoading && categories.length === 0 ? (
          <p className="px-1 py-2 text-sm text-[var(--drawer-text-secondary)]">
            No fields match your search.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
