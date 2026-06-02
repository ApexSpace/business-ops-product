"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceStatusBadge } from "@/components/integrations/resource-status-badge";
import {
  formatResourceDate,
  RESOURCE_TYPE_LABELS,
  type IntegrationResource,
} from "@/lib/integration-resources";

export interface IntegrationResourceCardProps {
  resource: IntegrationResource;
  canManage?: boolean;
  isPending?: boolean;
  onSelect?: (resourceId: string) => void;
  onUnselect?: (resourceId: string) => void;
  onMakeDefault?: (resourceId: string) => void;
}

export function IntegrationResourceCard({
  resource,
  canManage = false,
  isPending = false,
  onSelect,
  onUnselect,
  onMakeDefault,
}: IntegrationResourceCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleToggleSelected = (checked: boolean) => {
    if (checked) {
      onSelect?.(resource.id);
    } else {
      onUnselect?.(resource.id);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{resource.name}</p>
            {resource.isDefault ? (
              <Badge variant="secondary" className="gap-1">
                <Star className="size-3 fill-current" />
                Default
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{RESOURCE_TYPE_LABELS[resource.type]}</span>
            <span>·</span>
            <ResourceStatusBadge status={resource.status} />
            <span>·</span>
            <span>Synced {formatResourceDate(resource.lastSyncedAt)}</span>
          </div>
          {resource.externalId ? (
            <p className="truncate font-mono text-xs text-muted-foreground">
              {resource.externalId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={resource.isSelected}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  handleToggleSelected(checked === true)
                }
              />
              Selected
            </label>
          ) : null}

          {canManage && !resource.isDefault ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onMakeDefault?.(resource.id)}
            >
              Set default
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetailsOpen(true)}
          >
            Details
          </Button>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{resource.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Type: </span>
              {RESOURCE_TYPE_LABELS[resource.type]}
            </p>
            <p>
              <span className="text-muted-foreground">External ID: </span>
              <span className="font-mono text-xs">{resource.externalId}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              <ResourceStatusBadge status={resource.status} />
            </p>
            <p>
              <span className="text-muted-foreground">Selected: </span>
              {resource.isSelected ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">Default: </span>
              {resource.isDefault ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">Last synced: </span>
              {formatResourceDate(resource.lastSyncedAt)}
            </p>
            {resource.metadata && Object.keys(resource.metadata).length > 0 ? (
              <div>
                <p className="mb-1 text-muted-foreground">Metadata</p>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
                  {JSON.stringify(resource.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
