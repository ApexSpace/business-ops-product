"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmailTemplateRichEditorHandle = {
  insertContent: (content: string) => void;
  focus: () => void;
};

type EmailTemplateRichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

const UNSAFE_TAGS = new Set(["script", "iframe", "object", "embed", "form"]);

function extractWrapper(html: string): {
  wrapperOpen: string | null;
  inner: string;
} {
  const trimmed = html.trim();
  if (!trimmed) {
    return { wrapperOpen: null, inner: "" };
  }

  const match = trimmed.match(/^(<div(\s+[^>]*)?>)([\s\S]*)<\/div>$/i);
  if (match) {
    return { wrapperOpen: match[1], inner: match[3].trim() };
  }
  return { wrapperOpen: null, inner: trimmed };
}

function getEditorInnerHtml(html: string): string {
  const { inner } = extractWrapper(html);
  return inner || "<p></p>";
}

export function sanitizeEmailHtml(html: string): string {
  const withoutScripts = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  if (typeof DOMParser === "undefined") {
    return withoutScripts;
  }

  const doc = new DOMParser().parseFromString(withoutScripts, "text/html");
  const toRemove: Node[] = [];

  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as Element;
      const tag = element.tagName.toLowerCase();

      if (UNSAFE_TAGS.has(tag)) {
        toRemove.push(child);
        return;
      }

      for (const attr of [...element.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) {
          element.removeAttribute(attr.name);
          continue;
        }
        if (
          name === "href" &&
          attr.value.trim().toLowerCase().startsWith("javascript:")
        ) {
          element.removeAttribute(attr.name);
        }
      }

      walk(child);
    });
  };

  walk(doc.body);
  toRemove.forEach((node) => node.parentNode?.removeChild(node));

  return doc.body.innerHTML;
}

function combineHtml(wrapperOpen: string | null, inner: string): string {
  const sanitized = sanitizeEmailHtml(inner);
  if (wrapperOpen) {
    return `${wrapperOpen}${sanitized}</div>`;
  }
  return sanitized;
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="[&_svg]:size-5"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export const EmailTemplateRichEditor = forwardRef<
  EmailTemplateRichEditorHandle,
  EmailTemplateRichEditorProps
>(function EmailTemplateRichEditor(
  { value, onChange, id, className, disabled },
  ref,
) {
  const wrapperRef = useRef<string | null>(extractWrapper(value).wrapperOpen);
  const isInternalUpdate = useRef(false);
  const lastExternalValueRef = useRef(value);

  if (!isInternalUpdate.current) {
    wrapperRef.current = extractWrapper(value).wrapperOpen;
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: getEditorInnerHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          "prose prose-sm max-w-none min-h-[320px] px-3 py-2 text-sm outline-none",
          "[&_a]:text-primary [&_a]:underline",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_h1]:text-xl [&_h1]:font-semibold",
          "[&_h2]:text-lg [&_h2]:font-semibold",
          "[&_h3]:text-base [&_h3]:font-semibold",
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      isInternalUpdate.current = true;
      onChange(combineHtml(wrapperRef.current, currentEditor.getHTML()));
      requestAnimationFrame(() => {
        isInternalUpdate.current = false;
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || isInternalUpdate.current) return;
    if (lastExternalValueRef.current === value) return;

    lastExternalValueRef.current = value;
    const { wrapperOpen, inner } = extractWrapper(value);
    wrapperRef.current = wrapperOpen;
    editor.commands.setContent(inner || "<p></p>", { emitUpdate: false });
  }, [value, editor]);

  useImperativeHandle(
    ref,
    () => ({
      insertContent: (content: string) => {
        editor?.chain().focus().insertContent(content).run();
      },
      focus: () => {
        editor?.chain().focus().run();
      },
    }),
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn("min-h-[320px] animate-pulse bg-muted/20", className)}
      />
    );
  }

  return (
    <div className={cn("bg-background", className)}>
      <div className="flex flex-wrap gap-0.5 border-b border-border/60 bg-muted/30 p-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarButton>

        <div className="mx-0.5 w-px self-stretch bg-border/60" aria-hidden />

        <ToolbarButton
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 />
        </ToolbarButton>

        <div className="mx-0.5 w-px self-stretch bg-border/60" aria-hidden />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>

        <div className="mx-0.5 w-px self-stretch bg-border/60" aria-hidden />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </ToolbarButton>

        <div className="mx-0.5 w-px self-stretch bg-border/60" aria-hidden />

        <ToolbarButton
          label="Insert link"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={setLink}
        >
          <LinkIcon />
        </ToolbarButton>
      </div>

      <div className="min-h-[320px] max-h-[480px] resize-y overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
