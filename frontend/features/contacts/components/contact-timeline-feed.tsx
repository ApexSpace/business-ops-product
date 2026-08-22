"use client";

import { Star } from "lucide-react";
import { MobileStatusPill } from "@/components/mobile/mobile-status-pill";
import {
  CONTACTS_STATUS_REQUESTED_CLASS,
  CONTACTS_TIMELINE_CARD_CLASS,
  CONTACTS_TIMELINE_DOT_CLASS,
  CONTACTS_TIMELINE_META_CLASS,
  CONTACTS_TIMELINE_RAIL_CLASS,
  CONTACTS_TIMELINE_SUBTITLE_CLASS,
  CONTACTS_TIMELINE_TITLE_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { cn } from "@/lib/utils";

export type ContactTimelineBadge =
  | { kind: "closed"; label?: string }
  | { kind: "requested"; label?: string };

export interface ContactTimelineMoneyRow {
  label: string;
  value: string;
  emphasize?: boolean;
  bordered?: boolean;
}

export interface ContactTimelineCardItem {
  id: string;
  meta: string;
  title: string;
  subtitle?: string;
  /** Right-aligned amount on the primary title row (sale line). */
  amount?: string;
  badge?: ContactTimelineBadge;
  moneyRows?: ContactTimelineMoneyRow[];
  paymentLine?: string;
  footer?: string;
  actions?: React.ReactNode;
}

interface ContactTimelineFeedProps {
  items: ContactTimelineCardItem[];
  className?: string;
}

function TimelineBadge({ badge }: { badge: ContactTimelineBadge }) {
  if (badge.kind === "closed") {
    return (
      <MobileStatusPill
        tone="closed"
        label={badge.label ?? "Closed"}
        className="uppercase tracking-wide"
      />
    );
  }
  return (
    <span className={CONTACTS_STATUS_REQUESTED_CLASS}>
      <Star className="size-3 shrink-0 fill-current" aria-hidden />
      <span className="truncate">{badge.label ?? "Requested this person"}</span>
    </span>
  );
}

function TimelineCard({ item }: { item: ContactTimelineCardItem }) {
  const hasMoney = Boolean(item.moneyRows?.length || item.paymentLine);
  const headerBadge =
    item.badge?.kind === "closed" ? item.badge : undefined;
  const bodyBadge =
    item.badge?.kind === "requested" ? item.badge : undefined;

  return (
    <article className={CONTACTS_TIMELINE_CARD_CLASS}>
      <div className="flex w-full min-w-0 items-start justify-between gap-3 pb-2">
        <p className={cn(CONTACTS_TIMELINE_META_CLASS, "min-w-0 flex-1 pt-0.5")}>
          {item.meta}
        </p>
        <div className="flex shrink-0 items-start gap-1.5">
          {headerBadge ? <TimelineBadge badge={headerBadge} /> : null}
          {item.actions ? (
            <div className="inline-flex items-center gap-0.5">{item.actions}</div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full min-w-0 items-start justify-between gap-3",
          hasMoney && "border-b border-[#D4D0E0]/50 pb-3",
        )}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className={CONTACTS_TIMELINE_TITLE_CLASS}>{item.title}</h3>
          {item.subtitle ? (
            <p className={CONTACTS_TIMELINE_SUBTITLE_CLASS}>{item.subtitle}</p>
          ) : null}
          {bodyBadge ? (
            <div className="pt-1.5">
              <TimelineBadge badge={bodyBadge} />
            </div>
          ) : null}
        </div>
        {item.amount ? (
          <span
            className={cn(
              CONTACTS_TIMELINE_TITLE_CLASS,
              "shrink-0 tabular-nums",
            )}
          >
            {item.amount}
          </span>
        ) : null}
      </div>

      {item.moneyRows?.map((row) => (
        <div
          key={`${item.id}-${row.label}`}
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-3 py-2",
            row.bordered && "border-t border-[#D4D0E0]/50",
          )}
        >
          <span
            className={cn(
              "text-[13px] leading-5 text-[#1A1A1A]",
              row.emphasize ? "font-semibold" : "font-normal",
            )}
          >
            {row.label}
          </span>
          <span
            className={cn(
              "shrink-0 tabular-nums text-[13px] leading-5 text-[#1A1A1A]",
              row.emphasize ? "font-semibold" : "font-normal",
            )}
          >
            {row.value}
          </span>
        </div>
      ))}

      {item.paymentLine ? (
        <p className={cn(CONTACTS_TIMELINE_META_CLASS, "pt-1")}>
          {item.paymentLine}
        </p>
      ) : null}

      {item.footer ? (
        <p className={cn(CONTACTS_TIMELINE_META_CLASS, "pt-2")}>{item.footer}</p>
      ) : null}
    </article>
  );
}

/**
 * Figma timeline feed — violet rail + nodes, compact cards, perfect column alignment.
 */
export function ContactTimelineFeed({
  items,
  className,
}: ContactTimelineFeedProps) {
  if (items.length === 0) return null;

  return (
    <ol className={cn("relative m-0 flex list-none flex-col gap-4 p-0", className)}>
      <div className={CONTACTS_TIMELINE_RAIL_CLASS} aria-hidden />
      {items.map((item) => (
        <li key={item.id} className="relative flex items-start gap-3">
          <div className="flex w-3.5 shrink-0 justify-center pt-5">
            <span className={CONTACTS_TIMELINE_DOT_CLASS} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <TimelineCard item={item} />
          </div>
        </li>
      ))}
    </ol>
  );
}
