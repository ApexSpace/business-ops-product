import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import type { ConversationNote } from "@/features/conversations/api/conversation-notes.api";

export type ThreadTimelineMessage = {
  kind: "message";
  id: string;
  createdAt: string;
  message: ConversationMessage;
};

export type ThreadTimelineNote = {
  kind: "note";
  id: string;
  createdAt: string;
  note: ConversationNote;
};

export type ThreadTimelineEntry = ThreadTimelineMessage | ThreadTimelineNote;

function byCreatedAt(a: ThreadTimelineEntry, b: ThreadTimelineEntry): number {
  const delta =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (delta !== 0) return delta;
  if (a.kind === b.kind) return a.id.localeCompare(b.id);
  return a.kind === "message" ? -1 : 1;
}

/** Merge channel messages with staff-only internal notes for the thread timeline. */
export function buildThreadTimeline(
  messages: ConversationMessage[],
  notes: ConversationNote[] = [],
): ThreadTimelineEntry[] {
  const entries: ThreadTimelineEntry[] = [
    ...messages.map((message) => ({
      kind: "message" as const,
      id: `message:${message.id}`,
      createdAt: message.createdAt,
      message,
    })),
    ...notes.map((note) => ({
      kind: "note" as const,
      id: `note:${note.id}`,
      createdAt: note.createdAt,
      note,
    })),
  ];
  entries.sort(byCreatedAt);
  return entries;
}
