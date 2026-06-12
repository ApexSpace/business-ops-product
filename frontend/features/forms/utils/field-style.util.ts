import type { CSSProperties } from "react";
import type {
  BorderRadius,
  FieldStyle,
  FieldWidth,
  FontPreset,
  FormSettings,
  InputSize,
  LabelPosition,
  LabelSize,
} from "@/features/forms/types";
import { cn } from "@/lib/utils";

const WIDTH_CLASS: Record<FieldWidth, string> = {
  25: "w-1/4",
  33: "w-1/3",
  50: "w-1/2",
  67: "w-2/3",
  75: "w-3/4",
  100: "w-full",
};

const LABEL_SIZE_CLASS: Record<LabelSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const INPUT_SIZE_CLASS: Record<InputSize, string> = {
  sm: "h-8 text-xs px-2",
  md: "h-9 text-sm px-3",
  lg: "h-11 text-base px-4",
};

const BORDER_RADIUS_CLASS: Record<BorderRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const FONT_CLASS: Record<FontPreset, string> = {
  system: "font-sans",
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
};

function normalizeWidth(width?: FieldStyle["width"]): FieldWidth {
  if (width === "half") return 50;
  if (width === "full" || width == null) return 100;
  return width;
}

export function getFieldWidthClass(width?: FieldStyle["width"]): string {
  return WIDTH_CLASS[normalizeWidth(width)];
}

export function getLabelPositionClass(position?: LabelPosition): string {
  if (position === "left") return "flex flex-row items-center gap-3";
  if (position === "hidden") return "";
  return "flex flex-col gap-2";
}

export function getLabelSizeClass(size?: LabelSize): string {
  return LABEL_SIZE_CLASS[size ?? "sm"];
}

export function getInputSizeClass(size?: InputSize): string {
  return INPUT_SIZE_CLASS[size ?? "md"];
}

export function getBorderRadiusClass(radius?: BorderRadius): string {
  return BORDER_RADIUS_CLASS[radius ?? "md"];
}

export function getFontClass(font?: FontPreset): string {
  return FONT_CLASS[font ?? "system"];
}

export function getTextAlignClass(align?: FieldStyle["textAlign"]): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function getFieldWrapperStyle(style?: FieldStyle): CSSProperties {
  const marginBottom = style?.marginBottom;
  return marginBottom != null ? { marginBottom: `${marginBottom}px` } : {};
}

export function getLabelInlineStyle(style?: FieldStyle): CSSProperties {
  const result: CSSProperties = {};
  if (style?.labelColor) result.color = style.labelColor;
  return result;
}

export function getInputInlineStyle(style?: FieldStyle): CSSProperties {
  const result: CSSProperties = {};
  if (style?.inputBgColor) result.backgroundColor = style.inputBgColor;
  if (style?.inputTextColor) result.color = style.inputTextColor;
  if (style?.inputBorderColor) result.borderColor = style.inputBorderColor;
  return result;
}

export function getFormContainerStyle(settings: FormSettings): CSSProperties {
  const result: CSSProperties = {};
  if (settings.backgroundColor) result.backgroundColor = settings.backgroundColor;
  if (settings.textColor) result.color = settings.textColor;
  if (settings.padding != null) result.padding = `${settings.padding}px`;
  if (settings.maxWidth != null) result.maxWidth = `${settings.maxWidth}px`;
  return result;
}

export function getFormContainerClass(settings: FormSettings): string {
  return cn(
    "mx-auto w-full",
    getBorderRadiusClass(settings.borderRadius),
    getFontClass(settings.labelFont),
  );
}

export function getSubmitButtonStyle(settings: FormSettings): CSSProperties {
  const result: CSSProperties = {};
  if (settings.submitButtonBgColor) result.backgroundColor = settings.submitButtonBgColor;
  if (settings.submitButtonTextColor) result.color = settings.submitButtonTextColor;
  return result;
}

export function getSubmitButtonClass(settings: FormSettings): string {
  return cn(
    getBorderRadiusClass(settings.submitButtonRadius),
    settings.submitButtonFullWidth ? "w-full" : "w-auto",
    settings.submitButtonAlign === "center" && "mx-auto",
    settings.submitButtonAlign === "right" && "ml-auto",
  );
}

export function getPreviewDeviceWidth(device: "desktop" | "tablet" | "mobile"): string {
  if (device === "tablet") return "max-w-[768px]";
  if (device === "mobile") return "max-w-[390px]";
  return "max-w-3xl";
}
