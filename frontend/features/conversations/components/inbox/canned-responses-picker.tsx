"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { listCannedResponses } from "@/features/conversations/api/canned-responses.api";
import { CannedResponsesSettingsDialog } from "@/features/conversations/components/inbox/canned-responses-settings-dialog";
import { queryKeys } from "@/lib/query/keys";

interface CannedResponsesPickerProps {
  onSelect: (body: string) => void;
}

export function CannedResponsesPicker({ onSelect }: CannedResponsesPickerProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.cannedResponses.list(),
    queryFn: listCannedResponses,
  });

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0">
            <Zap className="size-4" />
            <span className="sr-only">Quick replies</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-medium text-muted-foreground">
              Quick replies
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-3.5" />
              Manage
            </Button>
          </div>
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No quick replies yet.{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setSettingsOpen(true)}
              >
                Add one
              </button>
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                  onClick={() => onSelect(item.body)}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <CannedResponsesSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
