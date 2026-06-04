import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type {
  Contact,
  Estimate,
  IndustryLabels,
  Invoice,
  Lead,
  Note,
  Payment,
  Task,
  WorkItem,
} from "@/features/contacts/types";

export interface ContactRecordsDataProps {
  contact: Contact;
  labels: IndustryLabels;
  businessTimezone?: string;
  leads: Lead[];
  workItems: WorkItem[];
  notes: Note[];
  tasks: Task[];
  appointments: Appointment[];
  leadsLoading: boolean;
  workItemsLoading: boolean;
  notesLoading: boolean;
  tasksLoading: boolean;
  appointmentsLoading: boolean;
  estimates?: Estimate[];
  invoices?: Invoice[];
  payments?: Payment[];
  financialLoading?: boolean;
}

export interface ContactRecordsActionsProps {
  canDeleteLead: boolean;
  onCreateLead: () => void;
  onCreateWorkItem: () => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onCreateAppointment?: () => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onEditWorkItem: (item: WorkItem) => void;
  onDeleteWorkItem: (id: string) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReopenTask: (id: string) => void;
}

export type ContactRecordsSectionProps = ContactRecordsDataProps &
  ContactRecordsActionsProps;
