import { ComingSoon } from "@/components/shared/coming-soon";

interface SettingsPlaceholderProps {
  comingSoonTitle: string;
  comingSoonDescription?: string;
}

export function SettingsPlaceholder({
  comingSoonTitle,
  comingSoonDescription,
}: SettingsPlaceholderProps) {
  return (
    <ComingSoon
      title={comingSoonTitle}
      description={comingSoonDescription}
      className="w-full max-w-none"
    />
  );
}
