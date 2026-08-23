import Link from "next/link";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { cn } from "@/lib/utils";

export interface AttentionItem {
  id: string;
  title: string;
  description?: string;
  href: string;
}

interface AttentionListProps {
  items: AttentionItem[];
  className?: string;
}

export function AttentionList({ items, className }: AttentionListProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-table-row-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <NavArrowIcon direction="right" size="lg" className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
