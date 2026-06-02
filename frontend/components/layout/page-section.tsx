import { cn } from "@/lib/utils";

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
}: PageSectionProps) {
  const hasHeader = title || description || actions;

  return (
    <section className={cn("space-y-3", className)}>
      {hasHeader ? (
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
            headerClassName,
          )}
        >
          <div className="min-w-0 space-y-0.5">
            {title ? (
              <h2 className="text-section-title">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-caption max-w-2xl">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
