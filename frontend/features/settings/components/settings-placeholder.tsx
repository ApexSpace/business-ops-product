import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

interface SettingsPlaceholderProps {
  title: string;
  description: string;
  comingSoonTitle: string;
  comingSoonDescription?: string;
}

export function SettingsPlaceholder({
  title,
  description,
  comingSoonTitle,
  comingSoonDescription,
}: SettingsPlaceholderProps) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader description={description} />
      <ComingSoon
        title={comingSoonTitle}
        description={comingSoonDescription}
        className="w-full max-w-none"
      />
    </div>
  );
}
