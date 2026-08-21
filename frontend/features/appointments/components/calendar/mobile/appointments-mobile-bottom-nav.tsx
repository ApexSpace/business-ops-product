"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Users } from "lucide-react";
import { useShellApps } from "@/components/shell/shell-apps-context";
import { MOBILE_CAL_BOTTOM_NAV_HEIGHT_PX } from "@/features/appointments/styles/mobile-calendar-tokens";
import { cn } from "@/lib/utils";

const TAB_CLASS =
  "relative flex h-full min-h-[44px] min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[#9A9A9A] transition-colors";

export function AppointmentsMobileBottomNav({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { openApps, appsItems } = useShellApps();
  const appointmentsActive = pathname.startsWith("/business/appointments");
  const clientsActive = pathname.startsWith("/business/contacts");

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex w-full shrink-0 items-stretch justify-between border-t border-[#E3E3E3] bg-white",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
      style={{ minHeight: MOBILE_CAL_BOTTOM_NAV_HEIGHT_PX }}
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
        className={TAB_CLASS}
        onClick={() => openApps()}
        disabled={appsItems.length === 0}
        aria-label="Apps"
      >
        <LayoutGrid className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
    </nav>
  );
}
