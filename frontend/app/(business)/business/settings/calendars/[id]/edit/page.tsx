import { CalendarSettingsEditor } from "@/components/calendars/calendar-settings-editor";

interface CalendarEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CalendarEditPage({ params }: CalendarEditPageProps) {
  const { id } = await params;
  return <CalendarSettingsEditor calendarId={id} />;
}
