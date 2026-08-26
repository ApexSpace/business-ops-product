import { cn } from "@/lib/utils";

export interface SettingsLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  /** Mobile/tablet index: sidebar is the only pane. */
  browseMode?: boolean;
  toolbar?: React.ReactNode;
  className?: string;
}

/**
 * Shared Settings shell: search/nav sidebar + content pane.
 * Width, gap, and padding use existing spacing tokens — not Figma pixel values.
 */
export function SettingsLayout({
  sidebar,
  children,
  browseMode = false,
  toolbar,
  className,
}: SettingsLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        toolbar && "gap-4",
        className,
      )}
    >
      {toolbar}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "min-h-0 min-w-0 flex-col overflow-hidden border-border bg-background",
            browseMode
              ? "flex w-full"
              : "hidden w-72 shrink-0 border-r lg:flex",
          )}
        >
          {sidebar}
        </aside>
        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-y-auto",
            browseMode && "hidden",
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
