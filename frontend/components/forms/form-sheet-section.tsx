import { cn } from "@/lib/utils";

interface FormSheetSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Card surface for grouped form blocks in slide-in drawers. */
  card?: boolean;
}

export function FormSheetSection({
  title,
  description,
  children,
  className,
  card = false,
}: FormSheetSectionProps) {
  return (
    <section
      className={cn(
        "space-y-3",
        card &&
          "rounded-xl border border-border bg-card/80 p-4 shadow-elevation-xs",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h3 className="text-drawer-section">{title}</h3>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
