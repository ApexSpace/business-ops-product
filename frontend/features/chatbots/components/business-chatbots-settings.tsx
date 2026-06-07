"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import {
  activateChatbot,
  chatbotStatusLabel,
  deleteChatbot,
  disableChatbot,
  duplicateChatbot,
  formatChatbotTableDate,
  getChatbotEmbed,
  getChatbotPlacementLabel,
  listChatbots,
  type Chatbot,
  type ChatbotStatus,
} from "@/features/chatbots/api/chatbots.api";
import { ChatbotCreateDialog } from "@/features/chatbots/components/chatbot-create-dialog";
import { queryKeys } from "@/lib/query/keys";

function chatbotStatusVariant(
  status: ChatbotStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "DRAFT") return "secondary";
  if (status === "DISABLED") return "outline";
  return "destructive";
}

export function BusinessChatbotsSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.chatbots.list(),
    queryFn: () => listChatbots({ limit: 50 }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.chatbots.all() });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "activate" | "disable" | "duplicate";
    }) => {
      if (action === "activate") return activateChatbot(id);
      if (action === "disable") return disableChatbot(id);
      return duplicateChatbot(id);
    },
    onSuccess: async (_, { action }) => {
      await invalidate();
      toast.success(
        action === "duplicate" ? "Chatbot duplicated" : "Chatbot updated",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteChatbot(id),
    onSuccess: async () => {
      await invalidate();
      toast.success("Chatbot removed");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyEmbed = async (id: string) => {
    try {
      const embed = await getChatbotEmbed(id);
      await navigator.clipboard.writeText(embed.embedCode ?? embed.embedScript);
      toast.success("Embed code copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy");
    }
  };

  const copyWidgetLink = async (id: string) => {
    try {
      const embed = await getChatbotEmbed(id);
      await navigator.clipboard.writeText(embed.widgetUrl);
      toast.success("Widget link copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy");
    }
  };

  const previewWidget = async (id: string) => {
    try {
      const embed = await getChatbotEmbed(id);
      window.open(embed.widgetUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open preview");
    }
  };

  const columns = useMemo<DataTableColumn<Chatbot>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-[180px]">
            <Link
              href={`/business/settings/chatbots/${row.id}/edit`}
              className="font-medium hover:underline"
            >
              {row.name}
            </Link>
            {row.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {row.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <Badge variant={chatbotStatusVariant(row.status)}>
            {chatbotStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "placement",
        header: "Placement",
        sortable: true,
        sortValue: (row) => getChatbotPlacementLabel(row),
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {getChatbotPlacementLabel(row)}
          </span>
        ),
      },
      {
        id: "conversations",
        header: "Conversations",
        sortable: true,
        sortValue: (row) => row.conversationsCount ?? 0,
        className: "text-right tabular-nums",
        cell: (row) => (
          <span className="tabular-nums text-sm">{row.conversationsCount ?? 0}</span>
        ),
      },
      {
        id: "lastActivity",
        header: "Last activity",
        sortable: true,
        sortValue: (row) => row.lastMessageAt ?? "",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatChatbotTableDate(row.lastMessageAt)}
          </span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatChatbotTableDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        actions={
          <ActionButton onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Chatbot
          </ActionButton>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No chatbots yet"
        emptyDescription="Create a website chatbot to capture leads and conversations from your website."
        emptyAction={
          <ActionButton onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Chatbot
          </ActionButton>
        }
        rowActions={(bot) => (
          <DataTableRowActions
            menuLabel={`Actions for ${bot.name}`}
            actions={[
              {
                label: "Edit",
                onClick: () =>
                  router.push(`/business/settings/chatbots/${bot.id}/edit`),
              },
              {
                label: "Preview",
                onClick: () => void previewWidget(bot.id),
              },
              {
                label: "Copy embed code",
                onClick: () => void copyEmbed(bot.id),
              },
              {
                label: "Copy widget link",
                onClick: () => void copyWidgetLink(bot.id),
              },
              {
                label: "Duplicate",
                onClick: () =>
                  statusMutation.mutate({ id: bot.id, action: "duplicate" }),
              },
              bot.status !== "ACTIVE"
                ? {
                    label: "Activate",
                    onClick: () =>
                      statusMutation.mutate({ id: bot.id, action: "activate" }),
                  }
                : {
                    label: "Disable",
                    onClick: () =>
                      statusMutation.mutate({ id: bot.id, action: "disable" }),
                  },
              {
                label: "Delete",
                onClick: () => setDeleteId(bot.id),
                destructive: true,
              },
            ]}
          />
        )}
      />

      <ChatbotCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          void invalidate();
          router.push(`/business/settings/chatbots/${id}/edit`);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete chatbot?"
        description="This chatbot and its rules will be removed. Existing conversations are kept."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
