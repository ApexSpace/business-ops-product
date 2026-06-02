import { Sparkles } from "lucide-react";
import { SettingsCard } from "@/components/layout/settings-card";

interface ComingSoonProps {
  title: string;
  description?: string;
  className?: string;
}

export function ComingSoon({ title, description, className }: ComingSoonProps) {
  return (
    <SettingsCard
      className={className ?? "max-w-lg"}
      title={title}
      description={
        description ??
        "This feature is on the roadmap. API integration is pending."
      }
    >
      <div className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-3 ring-1 ring-border/60">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Navigation is available so you can preview the full app structure.
        </p>
      </div>
    </SettingsCard>
  );
}
