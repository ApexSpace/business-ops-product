import { cn } from "@/lib/utils";

interface ListToolbarProps {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ListToolbar({
  search,
  filters,
  actions,
  className,
}: ListToolbarProps) {
  if (!search && !filters && !actions) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-thin">
        {search}
        {filters}
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
