"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldOption } from "@/features/forms/types";

interface OptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `opt_${Date.now()}`;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const addOption = () => {
    const nextIndex = options.length + 1;
    onChange([
      ...options,
      {
        id: generateId(),
        label: `Option ${nextIndex}`,
        value: `option_${nextIndex}`,
      },
    ]);
  };

  const updateOption = (index: number, patch: Partial<FieldOption>) => {
    const next = [...options];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeOption = (id: string) => {
    onChange(options.filter((option) => option.id !== id));
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-1">
          <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
          <Input
            value={option.label}
            onChange={(event) =>
              updateOption(index, {
                label: event.target.value,
                value: option.value || event.target.value,
              })
            }
            placeholder="Label"
            className="text-sm"
          />
          <Input
            value={option.value}
            onChange={(event) => updateOption(index, { value: event.target.value })}
            placeholder="Value"
            className="text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeOption(option.id)}
            aria-label="Remove option"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-1 size-3" />
        Add option
      </Button>
    </div>
  );
}
