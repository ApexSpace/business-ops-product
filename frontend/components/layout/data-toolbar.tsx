import { cn } from "@/lib/utils";

export interface DataToolbarProps {
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

/** Single-row toolbar: filters on the left, actions on the right. */
export function DataToolbar({
  filters,
  actions,
  meta,
  className,
}: DataToolbarProps) {
  if (!filters && !actions && !meta) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 pb-0.5 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto sm:gap-3">
        {filters ? (
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
            {filters}
          </div>
        ) : null}
        {meta ? (
          <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:ml-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
