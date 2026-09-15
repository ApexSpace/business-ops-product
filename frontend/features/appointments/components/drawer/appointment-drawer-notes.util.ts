export function isAppointmentFormNotesVisible(
  expanded: boolean,
  notes: string,
): boolean {
  return expanded || Boolean(notes.trim());
}

export function canCollapseAppointmentFormNotes(notes: string): boolean {
  return !notes.trim();
}
