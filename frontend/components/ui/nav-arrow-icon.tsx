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
   * Height of the glyph. Width follows the source aspect ratio (7.36 × 12.73).
   * `md` is the default chevron. A number is height in px.
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

/** Cropped to the filled chevron path (matches Figma vector bounds). */
const VIEW_BOX = "3.086 5.64 7.071 12.728";

const GLYPH_WIDTH = 7.36;
const GLYPH_HEIGHT = 12.73;

const SIZE_HEIGHT: Record<NavArrowSizeToken, number> = {
  sm: 10,
  md: GLYPH_HEIGHT,
  lg: 16,
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
  const fromSize = typeof size === "number" ? size : SIZE_HEIGHT[size];
  const resolvedHeight = height ?? fromSize;
  const resolvedWidth =
    width ?? (resolvedHeight * GLYPH_WIDTH) / GLYPH_HEIGHT;
  return { width: resolvedWidth, height: resolvedHeight };
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
        "block shrink-0 origin-center text-current",
        ROTATE_CLASS[direction],
        className,
      )}
      {...props}
    >
      <path fill="currentColor" fillRule="evenodd" d={ARROW_PATH} />
    </svg>
  );
}
