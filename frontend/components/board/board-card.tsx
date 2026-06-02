"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface BoardCardProps {
  id: string;
  dragData?: Record<string, unknown>;
  isOverlay?: boolean;
  isDragging?: boolean;
  isMoving?: boolean;
  dragDisabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BoardCard({
  id,
  dragData,
  isOverlay,
  isDragging: isDraggingProp,
  isMoving,
  dragDisabled,
  onClick,
  children,
  className,
}: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: dragData,
      disabled: isOverlay || isMoving || dragDisabled,
    });

  const dragging = isDraggingProp ?? isDragging;

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <article
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={cn(
        "group/card flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        "transition-[box-shadow,border-color,opacity,transform]",
        "hover:border-border hover:shadow-md",
        isOverlay && "rotate-1 scale-[1.02] border-primary/30 shadow-lg ring-2 ring-primary/15",
        (dragging || isMoving) && !isOverlay && "opacity-45",
        onClick && !isOverlay && "cursor-pointer",
        className,
      )}
      onClick={
        onClick && !isOverlay && !dragging
          ? (e) => {
              if ((e.target as HTMLElement).closest("[data-no-dnd]")) return;
              onClick();
            }
          : undefined
      }
      {...(!isOverlay && !dragDisabled ? listeners : {})}
      {...(!isOverlay && !dragDisabled ? attributes : {})}
    >
      {children}
    </article>
  );
}

export interface BoardCardHeaderProps {
  title: string;
  subtitle?: string;
  onTitleClick?: () => void;
}

export function BoardCardHeader({
  title,
  subtitle,
  onTitleClick,
}: BoardCardHeaderProps) {
  return (
    <div className="min-w-0">
      {onTitleClick ? (
        <button
          type="button"
          className="line-clamp-2 text-left text-sm font-semibold leading-snug text-foreground hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onTitleClick();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          data-no-dnd
        >
          {title}
        </button>
      ) : (
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {title}
        </h3>
      )}
      {subtitle ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function BoardCardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
  );
}

export function BoardCardValue({
  label = "Value",
  value,
}: {
  label?: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "" || value === "—") return null;

  return (
    <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
