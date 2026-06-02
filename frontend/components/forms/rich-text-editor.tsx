"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  className,
  disabled,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const syncFromDom = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html === "<br>" ? "" : html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || document.activeElement === el) return;
    const next = value || "";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const handleLink = () => {
    const url = window.prompt("Link URL");
    if (url?.trim()) {
      exec("createLink", url.trim());
      syncFromDom();
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-background",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div className="flex flex-wrap gap-0.5 border-b border-border/60 bg-muted/30 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("bold");
            syncFromDom();
          }}
        >
          <Bold className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("italic");
            syncFromDom();
          }}
        >
          <Italic className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Bullet list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("insertUnorderedList");
            syncFromDom();
          }}
        >
          <List className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Numbered list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec("insertOrderedList");
            syncFromDom();
          }}
        >
          <ListOrdered className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLink}
        >
          <LinkIcon className="size-3.5" />
        </Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        contentEditable={!disabled}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[120px] max-h-[280px] overflow-y-auto px-3 py-2 text-sm outline-none",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-primary [&_a]:underline",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        )}
        onInput={syncFromDom}
        onBlur={syncFromDom}
      />
    </div>
  );
}

/** Safe-ish preview: renders stored HTML from our editor. */
export function RichTextPreview({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (!html?.trim()) {
    return <p className={cn("text-sm text-muted-foreground", className)}>—</p>;
  }
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-sm text-muted-foreground",
        "[&_a]:text-primary [&_ul]:my-1 [&_ol]:my-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
