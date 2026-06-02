"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { NoteFormDialog } from "@/components/notes/note-form-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { formatTaskDueAt, formatTaskStatus } from "@/lib/task-profile";
import { notePreviewText } from "@/lib/note-profile";
import {
  invalidateNoteLists,
  invalidateTaskLists,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import type { Lead, Note, PaginatedResult, Task } from "@/types/api";

interface LeadRelatedRecordsProps {
  lead: Lead;
}

export function LeadRelatedRecords({ lead }: LeadRelatedRecordsProps) {
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const { data: notesData } = useQuery({
    queryKey: queryKeys.notes.list({ leadId: lead.id, page: 1, limit: 10 }),
    queryFn: () =>
      apiClient<PaginatedResult<Note>>("notes", {
        searchParams: { page: 1, limit: 10, leadId: lead.id },
      }),
    enabled: !!lead.id,
  });

  const { data: tasksData } = useQuery({
    queryKey: queryKeys.tasks.list({ leadId: lead.id, page: 1, limit: 10 }),
    queryFn: () =>
      apiClient<PaginatedResult<Task>>("tasks", {
        searchParams: { page: 1, limit: 10, leadId: lead.id },
      }),
    enabled: !!lead.id,
  });

  const notes = notesData?.items ?? [];
  const tasks = tasksData?.items ?? [];

  const refresh = () => {
    void invalidateNoteLists(queryClient);
    void invalidateTaskLists(queryClient);
  };

  return (
    <div className="space-y-3 border-b border-border/60 px-4 pb-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Notes
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setNoteOpen(true)}
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes linked.</p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-border/50 px-2 py-1.5 text-xs"
              >
                <p className="font-medium">{n.title}</p>
                <p className="line-clamp-2 text-muted-foreground">
                  {notePreviewText(n)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Tasks
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setTaskOpen(true)}
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks linked.</p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-border/50 px-2 py-1.5 text-xs"
              >
                <p className="font-medium">{t.title}</p>
                <p className="text-muted-foreground">
                  {formatTaskDueAt(t.dueAt)} · {formatTaskStatus(t.status)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NoteFormDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        defaultLeadId={lead.id}
        defaultContactId={lead.contactId ?? undefined}
        lockLead
        onSuccess={refresh}
      />

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultLeadId={lead.id}
        defaultContactId={lead.contactId ?? undefined}
        lockLead
        onSuccess={refresh}
      />
    </div>
  );
}
