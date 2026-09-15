import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

interface FullScreenEditorLayoutProps {
  children: React.ReactNode;
  /** Custom header; when set, backHref/title/actions are ignored. */
  header?: React.ReactNode;
  backHref?: string;
  /** Accessible label for the back control (icon-only). */
  backLabel?: string;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FullScreenEditorLayout({
  children,
  header,
  backHref,
  backLabel = "Back",
  title,
  actions,
  className,
  contentClassName,
}: FullScreenEditorLayoutProps) {
  const hasBuiltInHeader = Boolean(backHref || title || actions);
  const resolvedHeader =
    header ??
    (hasBuiltInHeader ? (
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-background px-[var(--page-padding-x)] py-3">
        {backHref ? (
          <IconButton
            aria-label={backLabel}
            className="size-9"
            nativeButton={false}
            render={<Link href={backHref} />}
          >
            <ArrowLeft className="size-4" />
          </IconButton>
        ) : null}
        {title ? (
          <div className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </div>
        ) : null}
        {actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
    ) : null);

  return (
    <div
      className={cn(
        "flex h-svh min-h-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      {resolvedHeader}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
