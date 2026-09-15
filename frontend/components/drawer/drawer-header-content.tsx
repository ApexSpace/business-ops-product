"use client";

import type { ReactNode } from "react";
import {
  DRAWER_DATE_EYEBROW_CLASS,
  DRAWER_HEADER_CONTENT_CLASS,
  DRAWER_TITLE_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerHeaderContentProps {
  eyebrow?: string;
  title: ReactNode;
  className?: string;
}

export function DrawerHeaderContent({
  eyebrow,
  title,
  className,
}: DrawerHeaderContentProps) {
  return (
    <div className={cn(DRAWER_HEADER_CONTENT_CLASS, className)}>
      {eyebrow ? (
        <p className={DRAWER_DATE_EYEBROW_CLASS}>{eyebrow}</p>
      ) : null}
      <span className={DRAWER_TITLE_CLASS}>
        {title}
      </span>
    </div>
  );
}
