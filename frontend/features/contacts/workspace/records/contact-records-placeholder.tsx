import { EmptyState } from "@/components/data-display/empty-state";

export function ContactRecordsSectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState compact title={title} description={description} className="py-12" />
  );
}
