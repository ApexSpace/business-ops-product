"use client";

import {
  Heart,
  ImageIcon,
  PenLine,
  ShieldCheck,
  Star,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FormField, FormSettings } from "@/features/forms/types";
import {
  getBorderRadiusClass,
  getFieldWidthClass,
  getFieldWrapperStyle,
  getFontClass,
  getInputInlineStyle,
  getInputSizeClass,
  getLabelInlineStyle,
  getLabelPositionClass,
  getLabelSizeClass,
  getTextAlignClass,
} from "@/features/forms/utils/field-style.util";

interface FieldRendererProps {
  field: FormField;
  settings?: FormSettings;
  showRequiredIndicator?: boolean;
  mode?: "builder" | "preview";
  interactive?: boolean;
  fieldError?: string;
  fieldErrors?: Record<string, string>;
  className?: string;
}

function RequiredMark({ required }: { required?: boolean }) {
  if (!required) return null;
  return <span className="text-destructive"> *</span>;
}

function FieldLabel({
  field,
  showRequiredIndicator,
  required,
}: {
  field: FormField;
  showRequiredIndicator?: boolean;
  required?: boolean;
}) {
  if (field.style?.labelPosition === "hidden") return null;

  return (
    <Label
      className={cn(
        getLabelSizeClass(field.style?.labelSize),
        field.style?.labelBold && "font-bold",
        getTextAlignClass(field.style?.textAlign),
      )}
      style={getLabelInlineStyle(field.style)}
    >
      {field.label}
      {showRequiredIndicator ? <RequiredMark required={required} /> : null}
    </Label>
  );
}

function FieldHelp({ helpText }: { helpText?: string }) {
  if (!helpText) return null;
  return <p className="text-xs text-muted-foreground">{helpText}</p>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function InputChrome({
  field,
  children,
  showRequiredIndicator,
  fieldError,
  className,
}: {
  field: FormField;
  children: React.ReactNode;
  showRequiredIndicator?: boolean;
  fieldError?: string;
  className?: string;
}) {
  const required = field.validation?.required;
  const position = field.style?.labelPosition ?? "top";

  return (
    <div
      className={cn(
        getFieldWidthClass(field.style?.width),
        getLabelPositionClass(position),
        getTextAlignClass(field.style?.textAlign),
        className,
      )}
      style={getFieldWrapperStyle(field.style)}
    >
      {position === "left" ? (
        <>
          <div className="min-w-[120px] shrink-0">
            <FieldLabel
              field={field}
              showRequiredIndicator={showRequiredIndicator}
              required={required}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">{children}</div>
        </>
      ) : (
        <>
          <FieldLabel
            field={field}
            showRequiredIndicator={showRequiredIndicator}
            required={required}
          />
          <div className="space-y-1">{children}</div>
        </>
      )}
      <FieldHelp helpText={field.helpText} />
      <FieldError message={fieldError} />
    </div>
  );
}

function StyledInput({
  field,
  type = "text",
  disabled,
  className,
  interactive = false,
}: {
  field: FormField;
  type?: string;
  disabled?: boolean;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <Input
      type={type}
      name={interactive ? field.name : undefined}
      placeholder={field.placeholder}
      disabled={disabled}
      defaultValue={field.defaultValue}
      required={interactive ? field.validation?.required : undefined}
      minLength={interactive ? field.validation?.minLength : undefined}
      maxLength={interactive ? field.validation?.maxLength : undefined}
      className={cn(
        "w-full",
        getInputSizeClass(field.style?.inputSize),
        getBorderRadiusClass(field.style?.inputBorderRadius),
        getFontClass(undefined),
        className,
      )}
      style={getInputInlineStyle(field.style)}
    />
  );
}

function RatingIcons({ style, count }: { style: FormField["ratingStyle"]; count: number }) {
  const icons = Array.from({ length: count }, (_, i) => i);
  const Icon =
    style === "hearts" ? Heart : style === "thumbs" ? ThumbsUp : style === "numbers" ? null : Star;

  return (
    <div className="flex items-center gap-1">
      {icons.map((i) =>
        style === "numbers" ? (
          <span
            key={i}
            className="flex size-8 items-center justify-center rounded border text-sm"
          >
            {i + 1}
          </span>
        ) : Icon ? (
          <Icon key={i} className="size-6 text-muted-foreground" />
        ) : null,
      )}
    </div>
  );
}

export function FieldRenderer({
  field,
  settings,
  showRequiredIndicator = true,
  mode = "builder",
  interactive = false,
  fieldError,
  fieldErrors,
  className,
}: FieldRendererProps) {
  const disabled = !interactive;
  const required = field.validation?.required;
  const inputFont = settings?.inputFont;

  if (field.type === "heading") {
    const level = field.level ?? 2;
    const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
    const sizeClass =
      level === 1
        ? "text-2xl"
        : level === 2
          ? "text-xl"
          : level === 3
            ? "text-lg"
            : "text-base";
    return (
      <Tag
        className={cn(
          "font-semibold",
          sizeClass,
          getFieldWidthClass(field.style?.width),
          getTextAlignClass(field.style?.textAlign),
          className,
        )}
        style={getFieldWrapperStyle(field.style)}
      >
        {field.content || field.label}
      </Tag>
    );
  }

  if (field.type === "paragraph") {
    return (
      <p
        className={cn(
          "text-sm text-muted-foreground",
          getFieldWidthClass(field.style?.width),
          getTextAlignClass(field.style?.textAlign),
          getFontClass(inputFont),
          className,
        )}
        style={getFieldWrapperStyle(field.style)}
      >
        {field.content || field.label}
      </p>
    );
  }

  if (field.type === "divider") {
    return (
      <hr
        className={cn("border-border", getFieldWidthClass(field.style?.width), className)}
        style={getFieldWrapperStyle(field.style)}
      />
    );
  }

  if (field.type === "spacer") {
    return (
      <div
        aria-hidden
        className={cn(getFieldWidthClass(field.style?.width), className)}
        style={{
          ...getFieldWrapperStyle(field.style),
          height: field.spacerHeight ?? 24,
        }}
      />
    );
  }

  if (field.type === "image") {
    return (
      <div
        className={cn(
          getFieldWidthClass(field.style?.width),
          getTextAlignClass(field.style?.textAlign),
          className,
        )}
        style={getFieldWrapperStyle(field.style)}
      >
        {field.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={field.src}
            alt={field.label}
            className="max-h-48 w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/30">
            <ImageIcon className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "hidden") {
    if (mode === "preview" && interactive) {
      return (
        <input
          type="hidden"
          name={field.name}
          defaultValue={field.hiddenValue ?? field.defaultValue ?? ""}
        />
      );
    }
    if (mode === "preview") return null;
    return (
      <p
        className={cn("text-xs italic text-muted-foreground", className)}
        style={getFieldWrapperStyle(field.style)}
      >
        Hidden field: {field.name}
      </p>
    );
  }

  if (field.type === "columns" && field.columns) {
    const cols = field.columnCount ?? 2;
    return (
      <div
        className={cn(
          "grid gap-4",
          cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
          getFieldWidthClass(field.style?.width),
          className,
        )}
        style={getFieldWrapperStyle(field.style)}
      >
        {field.columns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-4">
            {column.map((nested) => (
              <FieldRenderer
                key={nested.id}
                field={nested}
                settings={settings}
                showRequiredIndicator={showRequiredIndicator}
                mode={mode}
                interactive={interactive}
                fieldError={fieldError}
                fieldErrors={fieldErrors}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "captcha") {
    return (
      <InputChrome field={field} showRequiredIndicator={showRequiredIndicator} className={className}>
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-3">
          <Checkbox disabled={disabled} />
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span>I&apos;m not a robot</span>
          </div>
          {mode === "builder" ? (
            <span className="ml-auto text-xs text-muted-foreground">Captcha preview</span>
          ) : null}
        </div>
      </InputChrome>
    );
  }

  if (field.type === "signature") {
    return (
      <InputChrome field={field} showRequiredIndicator={showRequiredIndicator} className={className}>
        <div
          className={cn(
            "flex h-28 items-center justify-center rounded-md border border-dashed bg-muted/20",
            getBorderRadiusClass(field.style?.inputBorderRadius),
          )}
          style={getInputInlineStyle(field.style)}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PenLine className="size-4" />
            Sign here
          </div>
        </div>
      </InputChrome>
    );
  }

  if (field.type === "file") {
    return (
      <InputChrome field={field} showRequiredIndicator={showRequiredIndicator} className={className}>
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center",
            getBorderRadiusClass(field.style?.inputBorderRadius),
          )}
          style={getInputInlineStyle(field.style)}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {field.placeholder ?? "Drag & drop or click to upload"}
          </p>
          {field.accept ? (
            <p className="text-xs text-muted-foreground">Accepts: {field.accept}</p>
          ) : null}
        </div>
      </InputChrome>
    );
  }

  if (field.type === "rating") {
    const count = field.maxStars ?? 5;
    return (
      <InputChrome field={field} showRequiredIndicator={showRequiredIndicator} className={className}>
        <RatingIcons style={field.ratingStyle ?? "stars"} count={count} />
      </InputChrome>
    );
  }

  if (field.type === "range") {
    const min = field.validation?.min ?? 0;
    const max = field.validation?.max ?? 100;
    return (
      <InputChrome field={field} showRequiredIndicator={showRequiredIndicator} className={className}>
        <input
          type="range"
          min={min}
          max={max}
          step={field.step ?? 1}
          defaultValue={field.defaultValue ?? String(Math.round((min + max) / 2))}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </InputChrome>
    );
  }

  if (field.type === "toggle") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <div className="flex items-center gap-2">
          {interactive ? (
            <input
              type="checkbox"
              name={field.name}
              className="size-4"
              required={field.validation?.required}
            />
          ) : (
            <Switch disabled={disabled} />
          )}
          <span className="text-sm">{field.placeholder ?? field.label}</span>
        </div>
      </InputChrome>
    );
  }

  if (field.type === "name") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {field.showFirstName !== false ? (
            <div className="space-y-1">
              <Input
                name={interactive ? `${field.name}_first` : undefined}
                placeholder="First name"
                disabled={disabled}
                className="text-sm"
                required={interactive ? field.validation?.required : undefined}
              />
              <FieldError message={fieldErrors?.[`${field.name}_first`]} />
            </div>
          ) : null}
          {field.showMiddleName ? (
            <div className="space-y-1">
              <Input
                name={interactive ? `${field.name}_middle` : undefined}
                placeholder="Middle name"
                disabled={disabled}
                className="text-sm"
              />
              <FieldError message={fieldErrors?.[`${field.name}_middle`]} />
            </div>
          ) : null}
          {field.showLastName !== false ? (
            <div className="space-y-1">
              <Input
                name={interactive ? `${field.name}_last` : undefined}
                placeholder="Last name"
                disabled={disabled}
                className="text-sm"
                required={interactive ? field.validation?.required : undefined}
              />
              <FieldError message={fieldErrors?.[`${field.name}_last`]} />
            </div>
          ) : null}
        </div>
      </InputChrome>
    );
  }

  if (field.type === "address") {
    const subInputClass = cn(
      getInputSizeClass(field.style?.inputSize),
      getBorderRadiusClass(field.style?.inputBorderRadius),
    );
    const subInputStyle = getInputInlineStyle(field.style);
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <div className="grid gap-2">
          <Input
            name={interactive ? `${field.name}_street` : undefined}
            placeholder="Street address"
            disabled={disabled}
            className={subInputClass}
            style={subInputStyle}
            required={interactive ? field.validation?.required : undefined}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name={interactive ? `${field.name}_city` : undefined}
              placeholder="City"
              disabled={disabled}
              className={subInputClass}
              style={subInputStyle}
            />
            <Input
              name={interactive ? `${field.name}_state` : undefined}
              placeholder="State"
              disabled={disabled}
              className={subInputClass}
              style={subInputStyle}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name={interactive ? `${field.name}_zip` : undefined}
              placeholder="ZIP code"
              disabled={disabled}
              className={subInputClass}
              style={subInputStyle}
            />
            <Input
              name={interactive ? `${field.name}_country` : undefined}
              placeholder="Country"
              disabled={disabled}
              className={subInputClass}
              style={subInputStyle}
            />
          </div>
        </div>
      </InputChrome>
    );
  }

  if (field.type === "textarea") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <Textarea
          name={interactive ? field.name : undefined}
          placeholder={field.placeholder}
          disabled={disabled}
          defaultValue={field.defaultValue}
          required={interactive ? field.validation?.required : undefined}
          rows={field.rows ?? 4}
          className={cn(
            getBorderRadiusClass(field.style?.inputBorderRadius),
            getFontClass(inputFont),
          )}
          style={getInputInlineStyle(field.style)}
        />
      </InputChrome>
    );
  }

  if (field.type === "select") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <select
          name={interactive ? field.name : undefined}
          required={interactive ? field.validation?.required : undefined}
          className={cn(
            "flex w-full border border-input bg-transparent shadow-xs disabled:opacity-50",
            getInputSizeClass(field.style?.inputSize),
            getBorderRadiusClass(field.style?.inputBorderRadius),
            getFontClass(inputFont),
          )}
          style={getInputInlineStyle(field.style)}
          disabled={disabled}
          defaultValue=""
        >
          <option value="" disabled>
            {field.placeholder ?? "Select an option"}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputChrome>
    );
  }

  if (field.type === "multiselect") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <select
          name={interactive ? field.name : undefined}
          multiple
          className={cn(
            "flex min-h-24 w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs disabled:opacity-50",
            getBorderRadiusClass(field.style?.inputBorderRadius),
            getFontClass(inputFont),
          )}
          style={getInputInlineStyle(field.style)}
          disabled={disabled}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </InputChrome>
    );
  }

  if (field.type === "radio") {
    return (
      <InputChrome
        field={field}
        showRequiredIndicator={showRequiredIndicator}
        fieldError={fieldError}
        className={className}
      >
        <div className="space-y-2">
          {(field.options ?? []).map((option, index) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.name}
                value={option.value}
                disabled={disabled}
                required={interactive && required ? index === 0 : undefined}
              />
              {option.label}
            </label>
          ))}
        </div>
      </InputChrome>
    );
  }

  if (field.type === "checkbox") {
    const options = field.options ?? [];
    return (
      <div
        className={cn(
          getFieldWidthClass(field.style?.width),
          "space-y-2",
          className,
        )}
        style={getFieldWrapperStyle(field.style)}
      >
        {options.length > 0 ? (
          options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              {interactive ? (
                <input
                  type="checkbox"
                  name={field.name}
                  value={option.value}
                  disabled={disabled}
                />
              ) : (
                <Checkbox disabled={disabled} />
              )}
              <span>
                {option.label}
                {showRequiredIndicator ? <RequiredMark required={required} /> : null}
              </span>
            </label>
          ))
        ) : (
          <label className="flex items-center gap-2 text-sm">
            {interactive ? (
              <input
                type="checkbox"
                name={field.name}
                disabled={disabled}
                required={field.validation?.required}
              />
            ) : (
              <Checkbox disabled={disabled} />
            )}
            <span>
              {field.label}
              {showRequiredIndicator ? <RequiredMark required={required} /> : null}
            </span>
          </label>
        )}
        <FieldHelp helpText={field.helpText} />
        <FieldError message={fieldError} />
      </div>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "number"
          ? "number"
          : field.type === "password"
            ? "password"
            : field.type === "date"
              ? "date"
              : field.type === "time"
                ? "time"
                : field.type === "datetime"
                  ? "datetime-local"
                  : field.type === "website"
                    ? "url"
                    : "text";

  return (
    <InputChrome
      field={field}
      showRequiredIndicator={showRequiredIndicator}
      fieldError={fieldError}
      className={className}
    >
      <StyledInput
        field={field}
        type={inputType}
        disabled={disabled}
        interactive={interactive}
      />
    </InputChrome>
  );
}
