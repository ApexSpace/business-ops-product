"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** Accordion section item — must be rendered inside a parent `<Accordion>` (single-open). */
export function SectionHeader({ title, children, className }: SectionHeaderProps) {
  return (
    <AccordionItem value={title} className={cn("border-0 border-b border-border/60 pb-3", className)}>
      <AccordionTrigger className="px-0 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-0 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}
