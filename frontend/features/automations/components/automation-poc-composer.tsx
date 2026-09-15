"use client";

import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CustomValuePicker } from "@/features/automations/components/custom-value-picker";
import { insertMergeTagAtCursor } from "@/features/automations/utils/insert-merge-tag.util";

export function AutomationPocComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(
    "Hi {{contact.first_name}}, thanks for booking {{appointment.start_at}}.",
  );

  const handleInsert = (mergeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((current) => `${current}${mergeTag}`);
      return;
    }

    const { value, cursor } = insertMergeTagAtCursor(
      body,
      mergeTag,
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    setBody(value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const preview = useMemo(() => body, [body]);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="automation-poc-body">Message preview (POC)</Label>
        <p className="text-sm text-muted-foreground">
          Use the custom values button to insert merge tags into your message
          body.
        </p>
      </div>
      <div className="relative">
        <Textarea
          id="automation-poc-body"
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          className="pr-10"
        />
        <div className="absolute top-2 right-2">
          <CustomValuePicker onInsert={handleInsert} />
        </div>
      </div>
      <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="font-medium">Preview:</span>{" "}
        <span className="text-muted-foreground">{preview}</span>
      </div>
    </div>
  );
}
