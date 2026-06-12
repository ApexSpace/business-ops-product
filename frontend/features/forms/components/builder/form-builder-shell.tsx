"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { FieldType } from "@/features/forms/types";
import { getFieldTypeLabel } from "@/features/forms/utils/field-defaults.util";
import type { FormBuilderStateApi } from "@/features/forms/hooks/use-form-builder-state";
import { BuilderTopbar } from "@/features/forms/components/builder/builder-topbar";
import { FieldPalette } from "@/features/forms/components/builder/field-palette";
import {
  CANVAS_APPEND_ID,
  CANVAS_EMPTY_ID,
  FormCanvas,
} from "@/features/forms/components/builder/form-canvas";
import { FieldSettingsPanel } from "@/features/forms/components/builder/field-settings-panel";
import { FormEmbedDialog } from "@/features/forms/components/form-embed-dialog";
import { FormPreviewModal } from "@/features/forms/components/builder/form-preview-modal";

interface FormBuilderShellProps {
  builder: FormBuilderStateApi;
  onSave: () => void;
  onPublish: () => void;
  onMoveToDraft: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function FormBuilderShell({
  builder,
  onSave,
  onPublish,
  onMoveToDraft,
  onDuplicate,
  onArchive,
  onExport,
  onDelete,
}: FormBuilderShellProps) {
  const [activePaletteType, setActivePaletteType] = useState<FieldType | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const canvasColumnRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const handleDeselectField = () => {
    builder.setSelectedFieldId(null);
  };

  const handleBuilderPointerDown = (event: React.PointerEvent) => {
    const target = event.target as Node;
    if (canvasColumnRef.current?.contains(target)) return;
    if (settingsPanelRef.current?.contains(target)) return;
    handleDeselectField();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.source === "palette") {
      setActivePaletteType(data.type as FieldType);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePaletteType(null);
    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.source === "palette") {
      const type = activeData.type as FieldType;
      const overId = String(over.id);

      if (overId === CANVAS_EMPTY_ID || overId === CANVAS_APPEND_ID) {
        builder.addField(type);
        return;
      }

      const index = builder.definition.fields.findIndex(
        (field) => field.id === overId,
      );
      builder.addField(type, index >= 0 ? index : undefined);
      return;
    }

    if (activeData?.source === "canvas" && active.id !== over.id) {
      const overId = String(over.id);
      if (overId === CANVAS_APPEND_ID) {
        const activeId = String(active.id);
        const fields = builder.definition.fields;
        const oldIndex = fields.findIndex((field) => field.id === activeId);
        if (oldIndex >= 0 && oldIndex < fields.length - 1) {
          const lastField = fields[fields.length - 1];
          builder.reorderFields(activeId, lastField.id);
        }
        return;
      }
      builder.reorderFields(String(active.id), overId);
    }
  };

  const handleDragCancel = () => {
    setActivePaletteType(null);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      onPointerDown={handleBuilderPointerDown}
    >
      <div className="shrink-0">
        <BuilderTopbar
          formId={builder.formId}
          name={builder.name}
          status={builder.status}
          isDirty={builder.isDirty}
          isSaving={builder.isSaving}
          canSave={builder.isDirty || builder.mode === "create"}
          canUndo={builder.canUndo}
          canRedo={builder.canRedo}
          onNameChange={(value) => {
            builder.setName(value);
            builder.markDirty();
          }}
          onSave={onSave}
          onPreview={() => builder.setPreviewOpen(true)}
          onUndo={builder.undo}
          onRedo={builder.redo}
          onPublish={onPublish}
          onMoveToDraft={onMoveToDraft}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onExport={onExport}
          onEmbed={() => setEmbedOpen(true)}
          onDelete={onDelete}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 items-stretch overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)_300px]">
            <FieldPalette onAddField={builder.addField} className="hidden min-h-0 lg:flex" />
            <div ref={canvasColumnRef} className="min-h-0">
              <FormCanvas
                definition={builder.definition}
                selectedFieldId={builder.selectedFieldId}
                isDraggingFromPalette={activePaletteType != null}
                onSelectField={builder.setSelectedFieldId}
                onDeselectField={handleDeselectField}
                onDuplicateField={builder.duplicateField}
                onRemoveField={builder.removeField}
                onMoveField={builder.moveField}
                className="min-h-0"
              />
            </div>
            <div ref={settingsPanelRef} className="min-h-0">
              <FieldSettingsPanel
                selectedField={builder.selectedField}
                fields={builder.definition.fields}
                settings={builder.definition.settings}
                onUpdateField={builder.updateField}
                onUpdateSettings={builder.updateSettings}
                className="hidden min-h-0 lg:flex"
              />
            </div>
          </div>
        </div>

        <DragOverlay>
          {activePaletteType ? (
            <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
              {getFieldTypeLabel(activePaletteType)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <FormPreviewModal
        open={builder.previewOpen}
        onOpenChange={builder.setPreviewOpen}
        definition={builder.definition}
        previewDevice={builder.previewDevice}
        onPreviewDeviceChange={builder.setPreviewDevice}
      />

      <FormEmbedDialog
        open={embedOpen}
        onOpenChange={setEmbedOpen}
        formId={builder.formId}
        status={builder.status}
      />
    </div>
  );
}
