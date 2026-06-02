import { cn } from "@/lib/utils";

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {title || description ? (
        <legend className="mb-3 block w-full space-y-0.5">
          {title ? (
            <span className="text-subsection-title block">{title}</span>
          ) : null}
          {description ? (
            <span className="text-caption block font-normal">{description}</span>
          ) : null}
        </legend>
      ) : null}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
