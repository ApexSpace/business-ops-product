import { cn } from "@/lib/utils";

interface EntityDetailSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function EntityDetailSection({
  title,
  description,
  children,
  className,
}: EntityDetailSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <div>
          <h3 className="text-drawer-section">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

interface EntityDetailFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function EntityDetailField({
  label,
  children,
  className,
}: EntityDetailFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

interface EntityDetailFieldGridProps {
  children: React.ReactNode;
  className?: string;
}

export function EntityDetailFieldGrid({
  children,
  className,
}: EntityDetailFieldGridProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </dl>
  );
}
