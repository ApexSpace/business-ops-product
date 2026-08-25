"use client";

import { useRef, useState } from "react";
import { EmojiPicker } from "frimousse";
import {
  Cat,
  Clock,
  Flag,
  Hash,
  Lightbulb,
  Plane,
  Search,
  Smile,
  Soup,
  Users,
  Volleyball,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComposerEmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

const CATEGORY_NAV: {
  match: RegExp;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { match: /frequent|recent/i, label: "Frequently used", icon: Clock },
  { match: /smiley|emotion/i, label: "Smileys & emotion", icon: Smile },
  { match: /people|body/i, label: "People & body", icon: Users },
  { match: /animal|nature/i, label: "Animals & nature", icon: Cat },
  { match: /food|drink/i, label: "Food & drink", icon: Soup },
  { match: /travel|place/i, label: "Travel & places", icon: Plane },
  { match: /activit/i, label: "Activities", icon: Volleyball },
  { match: /object/i, label: "Objects", icon: Lightbulb },
  { match: /symbol/i, label: "Symbols", icon: Hash },
  { match: /flag/i, label: "Flags", icon: Flag },
];

function scrollViewportToCategory(
  root: HTMLElement | null,
  match: RegExp,
): void {
  if (!root) return;
  const viewport = root.querySelector(
    "[frimousse-viewport]",
  ) as HTMLElement | null;
  if (!viewport) return;

  const headers = root.querySelectorAll("[frimousse-category-header]");
  for (const header of headers) {
    const text = header.textContent?.trim() ?? "";
    if (!match.test(text)) continue;

    const category = header.closest("[frimousse-category]") as HTMLElement | null;
    const top = category?.offsetTop ?? (header as HTMLElement).offsetTop;
    viewport.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    return;
  }

  // Fallback: jump to top for recent/frequent when that section isn't present.
  if (/frequent|recent/i.test(match.source)) {
    viewport.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function ComposerEmojiPicker({
  onSelect,
  disabled = false,
  className,
}: ComposerEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_NAV[1]!.label);
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={cn(
              "shrink-0 rounded-full text-muted-foreground",
              open && "bg-muted/60 text-foreground",
              className,
            )}
            disabled={disabled}
            aria-label="Insert emoji"
            aria-pressed={open}
          >
            <Smile className="size-4" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-[320px] max-w-[calc(100vw-1.5rem)] overflow-hidden border-border/70 p-0 shadow-xl"
      >
        <EmojiPicker.Root
          ref={rootRef}
          columns={8}
          className="flex h-[360px] w-full flex-col overflow-hidden bg-popover"
          onEmojiSelect={({ emoji }) => {
            onSelect(emoji);
            setOpen(false);
          }}
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-2.5 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <EmojiPicker.Search
                placeholder="Search"
                className="h-8 w-full appearance-none rounded-md border-0 bg-muted/50 py-1.5 pr-2.5 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <EmojiPicker.SkinToneSelector
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
              aria-label="Change skin tone"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-0 border-b border-border/50 px-1 py-1">
            {CATEGORY_NAV.map(({ match, label, icon: Icon }) => {
              const isActive = activeCategory === label;
              return (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-muted text-foreground",
                  )}
                  onClick={() => {
                    setActiveCategory(label);
                    scrollViewportToCategory(rootRef.current, match);
                  }}
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          </div>

          <EmojiPicker.Viewport className="relative min-h-0 flex-1 overflow-y-auto outline-hidden">
            <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No emoji found.
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="select-none pb-2"
              components={{
                CategoryHeader: ({ category, ...props }) => (
                  <div
                    className="bg-popover px-3 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                    {...props}
                  >
                    {category.label}
                  </div>
                ),
                Row: ({ children, ...props }) => (
                  <div className="scroll-my-1.5 px-1.5" {...props}>
                    {children}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-md text-[1.35rem] leading-none transition-colors hover:bg-muted data-[active]:bg-muted"
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
