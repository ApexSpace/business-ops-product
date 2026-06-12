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
import {
  getFieldTypeLabel,
  PALETTE_CATEGORIES,
} from "@/features/forms/utils/field-defaults.util";

const FIELD_ICONS: Partial<Record<FieldType, React.ComponentType<{ className?: string }>>> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  password: KeyRound,
  textarea: AlignLeft,
  select: List,
  multiselect: List,
  radio: CircleDot,
  checkbox: CheckSquare,
  toggle: ToggleLeft,
  date: Calendar,
  time: Calendar,
  datetime: CalendarClock,
  file: FileUp,
  signature: PenLine,
  rating: Star,
  range: SlidersHorizontal,
  heading: Heading,
  paragraph: TextCursorInput,
  divider: Minus,
  spacer: Space,
  image: Image,
  hidden: EyeOff,
  name: User,
  address: AlignLeft,
  website: Globe,
  captcha: Shield,
  columns: Columns2,
};

interface PaletteItemProps {
  type: FieldType;
  onAddField: (type: FieldType) => void;
}

function PaletteItem({ type, onAddField }: PaletteItemProps) {
  const Icon = FIELD_ICONS[type] ?? Type;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, source: "palette" as const },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAddField(type)}
      className={cn(
        "flex w-full min-w-0 flex-row items-center gap-2 rounded-md border border-border p-2 text-xs transition-colors hover:bg-accent",
        isDragging && "opacity-50",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{getFieldTypeLabel(type)}</span>
    </button>
  );
}

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  className?: string;
}

const DEFAULT_OPEN_CATEGORY = PALETTE_CATEGORIES[0]?.id ?? "basic";

export function FieldPalette({ onAddField, className }: FieldPaletteProps) {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(DEFAULT_OPEN_CATEGORY);

  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PALETTE_CATEGORIES;

    return PALETTE_CATEGORIES.map((category) => ({
      ...category,
      types: category.types.filter((type) =>
        getFieldTypeLabel(type).toLowerCase().includes(query),
      ),
    })).filter((category) => category.types.length > 0);
  }, [search]);

  // Single-open accordion: while searching, open the first category (palette order) with matches.
  const effectiveOpenCategory = useMemo(() => {
    if (search.trim()) {
      return categories[0]?.id ?? null;
    }
    return openCategory;
  }, [search, categories, openCategory]);

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
          Drag or click to add fields.
        </p>
        <div className="mt-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search fields…"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1 pl-[var(--page-padding-x)] pr-2">
        <Accordion
          value={effectiveOpenCategory ? [effectiveOpenCategory] : []}
          onValueChange={(value) => setOpenCategory(value[0] ?? null)}
        >
          {categories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category.label}
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-1.5">
                <div className="grid grid-cols-2 gap-2">
                  {category.types.map((type) => (
                    <PaletteItem key={type} type={type} onAddField={onAddField} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {categories.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No fields match your search.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
