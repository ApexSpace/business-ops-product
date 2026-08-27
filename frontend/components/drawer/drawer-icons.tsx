import { cn } from "@/lib/utils";
import {
  DRAWER_ICON_CHEVRON,
  DRAWER_ICON_GEAR,
  DRAWER_ICON_MUTED,
  DRAWER_PLUS_BUTTON_CLASS,
} from "@/lib/design/drawer-tokens";

type IconProps = {
  className?: string;
  title?: string;
};

/** Calendar glyph ~18×20, muted warm grey */
export function DrawerCalendarIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block size-[18px] h-5 w-[18px] shrink-0", className)}
      style={{ color: DRAWER_ICON_MUTED }}
    >
      <path
        d="M14.5 2.5h-1V1.25a.75.75 0 0 0-1.5 0V2.5h-5.5V1.25a.75.75 0 0 0-1.5 0V2.5h-1A2.5 2.5 0 0 0 1.5 5v11.5A2.5 2.5 0 0 0 4 19h10a2.5 2.5 0 0 0 2.5-2.5V5A2.5 2.5 0 0 0 14.5 2.5Zm1 14A1 1 0 0 1 14.5 17.5h-11A1 1 0 0 1 2.5 16.5V8h13v8.5Zm0-10h-13V5A1 1 0 0 1 3.5 4h1v.75a.75.75 0 0 0 1.5 0V4h5.5v.75a.75.75 0 0 0 1.5 0V4h1A1 1 0 0 1 15.5 5v1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Clock glyph ~18×18 */
export function DrawerClockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block size-[18px] shrink-0", className)}
      style={{ color: DRAWER_ICON_MUTED }}
    >
      <path
        d="M9 1.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15Zm0 13.5A6 6 0 1 1 9 3a6 6 0 0 1 0 12Zm.75-9.25a.75.75 0 0 0-1.5 0V9c0 .2.08.39.22.53l2.25 2.25a.75.75 0 1 0 1.06-1.06L9.75 8.69V5.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerChevronIcon({
  className,
  direction = "down",
}: IconProps & { direction?: "down" | "right" | "left" }) {
  const rotate =
    direction === "down"
      ? "rotate-90"
      : direction === "left"
        ? "rotate-180"
        : "";
  return (
    <svg
      width={7.13}
      height={12.97}
      viewBox="0 0 8 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0", rotate, className)}
      style={{ color: DRAWER_ICON_CHEVRON }}
    >
      <path
        d="M1.5 1.5L6.5 7L1.5 12.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DrawerPlusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block size-4 shrink-0", className)}
    >
      <path
        d="M8 2.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 8 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerSettingsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block size-5 shrink-0", className)}
      style={{ color: DRAWER_ICON_GEAR }}
    >
      <path
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.86 14.52a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerCloseIcon({ className }: IconProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0", className)}
    >
      <path
        d="M3.28 3.28a.75.75 0 0 1 1.06 0L8 6.94l3.66-3.66a.75.75 0 1 1 1.06 1.06L9.06 8l3.66 3.66a.75.75 0 1 1-1.06 1.06L8 9.06l-3.66 3.66a.75.75 0 0 1-1.06-1.06L6.94 8 3.28 4.34a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerTrashIcon({ className }: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0", className)}
    >
      <path
        d="M7 21c-.55 0-1.02-.2-1.41-.59S5 19.55 5 19V7H4V5h5V4h6v1h5v2h-1v12c0 .55-.2 1.02-.59 1.41S17.55 21 17 21H7Zm2-4h2V9H9v8Zm4 0h2V9h-2v8ZM7 19h10V7H7v12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerPhoneIcon({ className }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0", className)}
      style={{ color: DRAWER_ICON_MUTED }}
    >
      <path
        d="M4.4 1.75c.3-.55.98-.74 1.5-.42l1.7 1.05c.48.3.66.91.42 1.4L7.3 5.4a.75.75 0 0 0 .08.8l1.42 1.9a.75.75 0 0 0 .8.27l1.82-.6c.52-.17 1.08.1 1.3.6l.85 1.9c.25.55.05 1.2-.47 1.48l-1.55.85a3.5 3.5 0 0 1-1.7.2A9.3 9.3 0 0 1 2.5 5.9a3.5 3.5 0 0 1 .2-1.7l.85-1.55c.2-.37.55-.6.95-.7.13-.03.26-.05.4-.05.17 0 .33.02.5.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerMailIcon({ className }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0", className)}
      style={{ color: DRAWER_ICON_MUTED }}
    >
      <path
        d="M2.5 3.5A1.5 1.5 0 0 0 1 5v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 15 11V5a1.5 1.5 0 0 0-1.5-1.5h-11Zm.3 1.5 5.05 3.37a.75.75 0 0 0 .8 0L13.7 5H2.8Zm11.2 1.12-4.9 3.28a2.25 2.25 0 0 1-2.4 0L1.8 6.62V11c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5V6.62Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerCardIcon({ className }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0 text-violet-primary-normal", className)}
    >
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7ZM3.5 4.5v1.25h9V4.5h-9Zm9 2.75h-9v4.25h9V7.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerMessageIcon({ className }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("block shrink-0 text-violet-primary-normal", className)}
    >
      <path
        d="M2.5 2.5A1.5 1.5 0 0 0 1 4v6a1.5 1.5 0 0 0 1.5 1.5H4v2.25a.75.75 0 0 0 1.24.57L8.3 11.5h5.2A1.5 1.5 0 0 0 15 10V4a1.5 1.5 0 0 0-1.5-1.5h-11ZM2.5 4h11v6H7.95a.75.75 0 0 0-.49.18L5.5 11.6V11a.75.75 0 0 0-.75-.75H2.5V4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DrawerPlusSquareButton({
  className,
  onClick,
  "aria-label": ariaLabel = "Add",
  stopPropagation = false,
  as = "button",
}: {
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  stopPropagation?: boolean;
  as?: "button" | "span";
}) {
  const icon = <DrawerPlusIcon className="size-3 text-white" />;
  const classes = cn(DRAWER_PLUS_BUTTON_CLASS, className);

  if (as === "span") {
    return (
      <span data-slot="drawer-plus" className={classes} aria-hidden>
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-slot="drawer-plus"
      aria-label={ariaLabel}
      onClick={(event) => {
        if (stopPropagation) {
          event.preventDefault();
          event.stopPropagation();
        }
        onClick?.();
      }}
      className={classes}
    >
      {icon}
    </button>
  );
}

export const PlusIconButton = DrawerPlusSquareButton;
