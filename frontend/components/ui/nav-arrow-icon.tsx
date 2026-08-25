import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type NavArrowDirection = "left" | "right" | "up" | "down";
export type NavArrowSizeToken = "sm" | "md" | "lg";
export type NavArrowSize = NavArrowSizeToken | number;

export interface NavArrowIconProps
  extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  /** Glyph faces this way. Default matches the source path (forward / next). */
  direction?: NavArrowDirection;
  /**
   * Side length of the square icon box in px.
   * `sm` 8 · `md` 10 (default) · `lg` 12. A number is an explicit box size.
   * Ignored for an axis when `width` / `height` is passed.
   */
  size?: NavArrowSize;
  /** Explicit width in px. Overrides the width from `size`. */
  width?: number;
  /** Explicit height in px. Overrides the height from `size`. */
  height?: number;
}

/**
 * Filled weui:arrow-filled chevron (calendar prev/next glyph).
 * Color via `currentColor` — set `text-*` on the icon or a parent.
 */
const ARROW_PATH =
  "M10.157 12.711L4.5 18.368l-1.414-1.414l4.95-4.95l-4.95-4.95L4.5 5.64l5.657 5.657a1 1 0 0 1 0 1.414";

/**
 * Square crop around the filled chevron so CSS rotation never overflows
 * a tall/narrow layout box (the previous 7.36×12.73 viewBox).
 */
const VIEW_BOX_SIZE = 12.728;
const VIEW_BOX_X = 3.086 - (VIEW_BOX_SIZE - 7.071) / 2;
const VIEW_BOX = `${VIEW_BOX_X} 5.64 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`;

/** Token box sizes. Old defaults were sm 10 / md 12.73 / lg 16. */
export const NAV_ARROW_SIZE_PX: Record<NavArrowSizeToken, number> = {
  sm: 8,
  md: 10,
  lg: 12,
};

const ROTATE_CLASS: Record<NavArrowDirection, string> = {
  right: "",
  left: "rotate-180",
  down: "rotate-90",
  up: "-rotate-90",
};

function resolveDimensions(
  size: NavArrowSize,
  width?: number,
  height?: number,
): { width: number; height: number } {
  const box = typeof size === "number" ? size : NAV_ARROW_SIZE_PX[size];
  return {
    width: width ?? box,
    height: height ?? box,
  };
}

export function NavArrowIcon({
  direction = "right",
  size = "md",
  width: widthProp,
  height: heightProp,
  className,
  style,
  ...props
}: NavArrowIconProps) {
  const { width, height } = resolveDimensions(size, widthProp, heightProp);

  return (
    <svg
      viewBox={VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      width={width}
      height={height}
      style={{ width, height, ...style }}
      className={cn(
        // `size-auto` opts out of parent `[&_svg:not([class*='size-'])]:size-4` rules.
        "size-auto block shrink-0 origin-center overflow-visible text-current",
        ROTATE_CLASS[direction],
        className,
      )}
      {...props}
    >
      <path fill="currentColor" fillRule="evenodd" d={ARROW_PATH} />
    </svg>
  );
}
