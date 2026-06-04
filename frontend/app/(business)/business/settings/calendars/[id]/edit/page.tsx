import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const CalendarSettingsEditor = dynamic(
  () =>
    import("@/features/calendars/components/calendar-settings-editor").then(
      (m) => m.CalendarSettingsEditor,
    ),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

interface CalendarEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CalendarEditPage({ params }: CalendarEditPageProps) {
  const { id } = await params;
  return <CalendarSettingsEditor calendarId={id} />;
}
