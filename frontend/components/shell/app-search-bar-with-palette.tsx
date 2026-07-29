"use client";

import { AppSearchBar } from "./app-search-bar";
import { useOptionalCommandPalette } from "./command-palette-provider";

export function AppSearchBarWithPalette({
  className,
}: {
  className?: string;
}) {
  const commandPalette = useOptionalCommandPalette();

  return (
    <AppSearchBar
      className={className}
      onClick={() => commandPalette?.openPalette()}
    />
  );
}
