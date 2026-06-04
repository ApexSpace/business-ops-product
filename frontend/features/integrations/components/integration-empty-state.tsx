import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntegrationEmptyStateCopy } from "@/features/integrations/utils/integration-manage-copy";

export interface IntegrationEmptyStateProps {
  copy: IntegrationEmptyStateCopy;
  onReconnect?: () => void;
  reconnectLabel?: string;
  onSync?: () => void;
  syncLabel?: string;
  isSyncPending?: boolean;
  syncDisabled?: boolean;
}

export function IntegrationEmptyState({
  copy,
  onReconnect,
  reconnectLabel = "Reconnect",
  onSync,
  syncLabel = "Sync accounts",
  isSyncPending = false,
  syncDisabled = false,
}: IntegrationEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
      <p className="text-sm font-medium text-foreground">{copy.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.message}</p>
      {copy.checklist.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {copy.checklist.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm text-muted-foreground"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {(onReconnect || onSync || copy.learnMoreUrl) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onReconnect ? (
            <Button type="button" size="sm" onClick={onReconnect}>
              {reconnectLabel}
            </Button>
          ) : null}
          {onSync ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncDisabled || isSyncPending}
              onClick={onSync}
            >
              {syncLabel}
            </Button>
          ) : null}
          {copy.learnMoreUrl ? (
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={copy.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {copy.learnMoreLabel ?? "Learn more"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
