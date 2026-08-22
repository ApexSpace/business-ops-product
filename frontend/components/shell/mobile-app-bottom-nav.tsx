"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Users } from "lucide-react";
import { useShellApps } from "@/components/shell/shell-apps-context";
import { MOBILE_LIST_BOTTOM_NAV_HEIGHT_PX } from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

const TAB_CLASS =
  "relative flex h-full min-h-[44px] min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[var(--drawer-icon-gear)] transition-colors";

/**
 * Shared product mobile bottom nav (Clients · Appointments · Apps).
 * Used by Appointments, Contacts, Sales, Payments lists, and other entity lists.
 */
export function MobileAppBottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { openApps, appsItems } = useShellApps();
  const appointmentsActive = pathname.startsWith("/business/appointments");
  const clientsActive = pathname.startsWith("/business/contacts");
  const appsActive =
    pathname.startsWith("/business/") &&
    !clientsActive &&
    !appointmentsActive;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex w-full shrink-0 items-stretch justify-between border-t border-[var(--pc-black-secondary-light)] bg-white",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
      style={{ minHeight: MOBILE_LIST_BOTTOM_NAV_HEIGHT_PX }}
    >
      <Link
        href="/business/contacts"
        className={cn(
          TAB_CLASS,
          clientsActive && "text-violet-primary-normal",
        )}
        aria-current={clientsActive ? "page" : undefined}
      >
        <Users className="size-6" strokeWidth={1.75} aria-hidden />
        {clientsActive ? (
          <span
            className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-violet-primary-normal"
            aria-hidden
          />
        ) : null}
        <span className="sr-only">Clients</span>
      </Link>

      <Link
        href="/business/appointments"
        className={cn(
          TAB_CLASS,
          appointmentsActive && "text-violet-primary-normal",
        )}
        aria-current={appointmentsActive ? "page" : undefined}
      >
        <CalendarDays className="size-6" strokeWidth={1.75} aria-hidden />
        {appointmentsActive ? (
          <span
            className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-violet-primary-normal"
            aria-hidden
          />
        ) : null}
        <span className="sr-only">Appointments</span>
      </Link>

      <button
        type="button"
        className={cn(
          TAB_CLASS,
          appsActive && "text-violet-primary-normal",
        )}
        onClick={() => openApps()}
        disabled={appsItems.length === 0}
        aria-label="Apps"
        aria-current={appsActive ? "page" : undefined}
      >
        <LayoutGrid className="size-6" strokeWidth={1.75} aria-hidden />
        {appsActive ? (
          <span
            className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-violet-primary-normal"
            aria-hidden
          />
        ) : null}
      </button>
    </nav>
  );
}
