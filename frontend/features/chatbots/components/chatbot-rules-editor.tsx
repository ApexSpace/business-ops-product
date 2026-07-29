"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import {
  Download,
  GripVertical,
  Loader2,
  Play,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import {
  createChatbotRule,
  deleteChatbotRule,
  exportChatbotRules,
  importChatbotRules,
  previewChatbotRule,
  reorderChatbotRules,
  type ChatbotRule,
  type ChatbotRuleTriggerType,
} from "@/features/chatbots/api/chatbots.api";
import { useChatbotsHost } from "@/features/chatbots/chatbots-host-context";

function SortableRuleRow({
  rule,
  onDelete,
}: {
  rule: ChatbotRule;
  onDelete: (ruleId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: rule.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-start gap-2 rounded-lg border border-border/60 p-3"
    >
      <button
        type="button"
        className="mt-1 text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{rule.triggerType}</Badge>
          {!rule.isActive ? (
            <Badge variant="secondary">Inactive</Badge>
          ) : null}
        </div>
        <p className="mt-1 font-medium">{rule.triggerText}</p>
        <p className="text-sm text-muted-foreground">{rule.responseText}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onDelete(rule.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

interface ChatbotRulesEditorProps {
  chatbotId: string;
  rules: ChatbotRule[];
  onChanged: () => void;
}

export function ChatbotRulesEditor({
  chatbotId,
  rules,
  onChanged,
}: ChatbotRulesEditorProps) {
  const { apiBase } = useChatbotsHost();
  const [triggerType, setTriggerType] =
    useState<ChatbotRuleTriggerType>("CONTAINS");
  const [triggerText, setTriggerText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.sortOrder - b.sortOrder),
    [rules],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const reorderMutation = useMutation({
    mutationFn: (ruleIds: string[]) =>
      reorderChatbotRules(chatbotId, ruleIds, apiBase),
    onSuccess: () => {
      onChanged();
      toast.success("Rules reordered");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const previewMutation = useMutation({
    mutationFn: (text: string) => previewChatbotRule(chatbotId, text, apiBase),
    onSuccess: (result) => {
      setPreviewResult(result.text ?? "No matching reply");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedRules.findIndex((rule) => rule.id === active.id);
    const newIndex = sortedRules.findIndex((rule) => rule.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(sortedRules, oldIndex, newIndex);
    reorderMutation.mutate(next.map((rule) => rule.id));
  };

  const handleExport = async () => {
    const data = await exportChatbotRules(chatbotId, apiBase);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chatbot-rules-${chatbotId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Array<{
      triggerType: ChatbotRuleTriggerType;
      triggerText: string;
      responseText: string;
      sortOrder?: number;
      isActive?: boolean;
    }>;
    await importChatbotRules(chatbotId, parsed, true, apiBase);
    onChanged();
    toast.success("Rules imported");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void handleExport()}>
          <Download className="mr-1 size-4" />
          Export
        </Button>
        <label className="inline-flex">
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file).catch((error: Error) => toast.error(error.message));
              e.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<span />}
          >
            <Upload className="mr-1 size-4" />
            Import
          </Button>
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedRules.map((rule) => rule.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {sortedRules.map((rule) => (
              <SortableRuleRow
                key={rule.id}
                rule={rule}
                onDelete={setDeleteRuleId}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Test rules</p>
        <p className="text-xs text-muted-foreground">
          Type sample visitor text and preview which rule would reply.
        </p>
        <div className="flex items-center gap-2">
          <Input
            className="min-w-0 flex-1"
            placeholder="Visitor says…"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const text = previewText.trim();
              if (text && !previewMutation.isPending) {
                previewMutation.mutate(text);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={!previewText.trim() || previewMutation.isPending}
            onClick={() => previewMutation.mutate(previewText.trim())}
          >
            {previewMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Test
          </Button>
        </div>
        {previewResult ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{previewResult}</p>
        ) : null}
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Add rule</p>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={triggerType}
          onChange={(e) =>
            setTriggerType(e.target.value as ChatbotRuleTriggerType)
          }
        >
          <option value="EXACT_MATCH">Exact match</option>
          <option value="CONTAINS">Contains</option>
          <option value="STARTS_WITH">Starts with</option>
          <option value="FALLBACK">Fallback</option>
        </select>
        <Input
          placeholder="When visitor says…"
          value={triggerText}
          onChange={(e) => setTriggerText(e.target.value)}
        />
        <Textarea
          placeholder="Reply with…"
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={2}
        />
        <Button
          size="sm"
          disabled={!triggerText.trim() || !responseText.trim()}
          onClick={() =>
            createChatbotRule(
              chatbotId,
              {
                triggerType,
                triggerText: triggerText.trim(),
                responseText: responseText.trim(),
              },
              apiBase,
            ).then(() => {
              setTriggerText("");
              setResponseText("");
              onChanged();
              toast.success("Rule added");
            })
          }
        >
          <Plus className="mr-1 size-4" />
          Add rule
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={deleteRuleId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRuleId(null);
        }}
        title="Delete rule?"
        description="This rule will be permanently removed."
        onConfirm={async () => {
          if (!deleteRuleId) return;
          await deleteChatbotRule(chatbotId, deleteRuleId, apiBase);
          setDeleteRuleId(null);
          onChanged();
          toast.success("Rule deleted");
        }}
      />
    </div>
  );
}
