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
  user: User,
  globe: Globe,
  heading: Heading,
  "text-cursor-input": TextCursorInput,
  minus: Minus,
  space: Space,
  image: Image,
  "columns-2": Columns2,
};

const DISALLOWED_IN_COLUMN_TYPES = new Set<FieldType>(["columns", "hidden", "captcha"]);

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
        "flex w-full min-w-0 flex-row items-center gap-2 rounded-md border border-border p-2 text-xs transition-colors hover:bg-accent",
        isDragging && "opacity-50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
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
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-r bg-muted/20",
        className,
      )}
    >
      <div className="shrink-0 border-b py-2 pl-[var(--page-padding-x)] pr-2">
        <h2 className="text-sm font-semibold">Field palette</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {columnAddContext
            ? "Click or drag a field to add it to the selected column."
            : "Drag or click to add fields."}
        </p>

        {columnAddContext ? (
          <div className="mt-3 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
              Add to column
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: columnAddContext.columnCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onTargetColumnChange?.(index)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    columnAddContext.targetColumnIndex === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent",
                  )}
                >
                  Column {index + 1}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search fields…"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1 pl-[var(--page-padding-x)] pr-2">
        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-4 text-sm text-muted-foreground">
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
                <AccordionTrigger className="px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category.label}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-1.5">
                  <div className="grid grid-cols-2 gap-2">
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
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No fields match your search.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
