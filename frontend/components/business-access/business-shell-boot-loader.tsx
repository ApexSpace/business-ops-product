import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_HEADER_HEIGHT } from "@/components/shell/shell-constants";

const NAV_SKELETON_COUNT = 10;

export function BusinessShellBootLoader() {
  return (
    <div
      className="flex h-svh min-h-0 overflow-hidden bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading business workspace"
    >
      <aside
        className="hidden w-[14.5rem] shrink-0 flex-col border-r border-sidebar-border md:flex"
        aria-hidden
      >
        <div
          className={`${SHELL_HEADER_HEIGHT} gap-2.5 border-b border-sidebar-border px-3`}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-7 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-px px-2 py-2">
          {Array.from({ length: NAV_SKELETON_COUNT }).map((_, index) => (
            <div
              key={`boot-nav-${index}`}
              className="flex h-9 items-center gap-2 rounded-md px-2"
            >
              <Skeleton className="size-4 shrink-0 rounded" />
              <Skeleton className="h-3 w-24 max-w-[70%]" />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`${SHELL_HEADER_HEIGHT} shrink-0 gap-2 border-b border-border/80 px-3 sm:px-4`}
        >
          <Skeleton className="hidden h-4 w-40 md:block" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-[var(--page-stack-gap)]">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`boot-widget-${index}`}
                  className="min-h-[7.25rem] rounded-lg"
                />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
