"use client";

import { useState } from "react";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceResourceType } from "@/features/resources/types";
import { resourceTypeLabel } from "@/features/resources/utils/resource-schedule.util";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

const RESOURCE_TYPES: ServiceResourceType[] = [
  "ROOM",
  "EQUIPMENT",
  "CONSUMABLE",
];

type ResourceCreateFormProps = {
  groupLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (body: {
    name: string;
    resourceType: ServiceResourceType;
  }) => void;
};

export function ResourceCreateForm({
  groupLabel,
  isPending,
  onCancel,
  onSubmit,
}: ResourceCreateFormProps) {
  const [name, setName] = useState("");
  const [resourceType, setResourceType] =
    useState<ServiceResourceType>("ROOM");

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "mx-auto max-w-lg")}>
      <p className="text-sm text-muted-foreground">{groupLabel}</p>
      <h2 className="text-xl font-semibold">New resource</h2>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          onSubmit({ name: trimmed, resourceType });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="new-resource-name">Name</Label>
          <Input
            id="new-resource-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={resourceType}
            onValueChange={(v) => v && setResourceType(v as ServiceResourceType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {resourceTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SettingsFormActions
          onDiscard={onCancel}
          onSave={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            onSubmit({ name: trimmed, resourceType });
          }}
          isDirty={Boolean(name.trim())}
          isSubmitting={isPending}
          saveLabel="Save"
          discardLabel="Discard"
        />
      </form>
    </div>
  );
}
