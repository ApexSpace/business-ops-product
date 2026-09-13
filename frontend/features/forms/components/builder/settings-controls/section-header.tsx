"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { SETTINGS_GROUP_TITLE_CLASS } from "@/lib/design/settings-form-tokens";

interface SectionHeaderProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** Accordion section item — must be rendered inside a parent `<Accordion>` (single-open). */
export function SectionHeader({ title, children, className }: SectionHeaderProps) {
  return (
    <AccordionItem value={title} className={cn("border-0 border-b border-[var(--drawer-header-border)] pb-3", className)}>
      <AccordionTrigger className={cn(SETTINGS_GROUP_TITLE_CLASS, "px-0 py-2 hover:no-underline")}>
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-0 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}
