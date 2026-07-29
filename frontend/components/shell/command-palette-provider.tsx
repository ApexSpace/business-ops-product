"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppCommandPalette } from "./app-command-palette";
import {
  isCommandPaletteShortcut,
  isEditableTarget,
} from "@/lib/utils/keyboard";

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({
  children,
  enabled = true,
  searchPlaceholder,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => {
    if (!enabled) return;
    setOpen(true);
  }, [enabled]);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandPaletteShortcut(event)) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  const value = useMemo(
    () => ({
      open,
      openPalette,
      closePalette,
      setOpen,
    }),
    [open, openPalette, closePalette],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {enabled ? (
        <AppCommandPalette
          open={open}
          onOpenChange={setOpen}
          searchPlaceholder={searchPlaceholder}
        />
      ) : null}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}

export function useOptionalCommandPalette() {
  return useContext(CommandPaletteContext);
}
