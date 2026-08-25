"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  Combobox,
  ComboboxFieldInput,
  ComboboxItemIndicator,
  ComboboxPopup,
  COMBOBOX_EMPTY_CLASS,
  COMBOBOX_ITEM_CLASS,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHONE_DIAL_CODE,
  digitsOnly,
  getPhoneCountry,
  parseE164Phone,
  PHONE_COUNTRIES,
  toE164Phone,
  type PhoneCountry,
} from "@/lib/forms/phone";

export interface PhoneInputProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showClear?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

function CountryDialSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
}) {
  const country = getPhoneCountry(value);

  return (
    <Combobox.Root
      items={PHONE_COUNTRIES}
      value={country}
      onValueChange={(next) => {
        if (next) onChange(next.dialCode);
      }}
      disabled={disabled}
      modal={false}
      autoHighlight
      autoComplete="off"
      itemToStringLabel={(item) => `${item.flag} ${item.dialCode}`}
      isItemEqualToValue={(left, right) => left.dialCode === right.dialCode}
      filter={(item, query) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          item.dialCode.includes(q) ||
          item.label.toLowerCase().includes(q) ||
          item.flag.includes(q)
        );
      }}
    >
      <ComboboxFieldInput
        disabled={disabled}
        aria-label={`Country code ${country.dialCode}`}
        className="h-full min-w-[5.75rem] rounded-none border-0 bg-transparent px-2.5 pr-7 shadow-none focus-visible:border-transparent focus-visible:ring-0"
      />
      <ComboboxPopup align="start" className="w-72 min-w-72">
        <Combobox.Empty className={COMBOBOX_EMPTY_CLASS}>
          No countries found
        </Combobox.Empty>
        <Combobox.List>
          {(item: PhoneCountry) => (
            <Combobox.Item
              key={item.dialCode}
              value={item}
              className={COMBOBOX_ITEM_CLASS}
            >
              <span className="shrink-0 text-base leading-none">{item.flag}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {item.dialCode}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {item.label}
              </span>
              <ComboboxItemIndicator />
            </Combobox.Item>
          )}
        </Combobox.List>
      </ComboboxPopup>
    </Combobox.Root>
  );
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "555 444 1234",
  disabled,
  showClear = true,
  id,
  "aria-invalid": ariaInvalid,
  className,
}: PhoneInputProps) {
  const parsed = useMemo(() => parseE164Phone(value), [value]);
  const [dialCode, setDialCode] = useState(
    parsed?.dialCode ?? DEFAULT_PHONE_DIAL_CODE,
  );
  const [nationalDigits, setNationalDigits] = useState(
    parsed?.nationalDigits ?? "",
  );

  useEffect(() => {
    const next = parseE164Phone(value);
    setDialCode(next?.dialCode ?? DEFAULT_PHONE_DIAL_CODE);
    setNationalDigits(next?.nationalDigits ?? "");
  }, [value]);

  const emitChange = (code: string, digits: string) => {
    onChange(toE164Phone(code, digits));
  };

  const handleDialCodeChange = (code: string) => {
    setDialCode(code);
    emitChange(code, nationalDigits);
  };

  const handleNationalChange = (raw: string) => {
    const digits = digitsOnly(raw);
    setNationalDigits(digits);
    emitChange(dialCode, digits);
  };

  const handleClear = () => {
    setNationalDigits("");
    onChange(null);
  };

  return (
    <div
      className={cn(
        "flex h-[var(--control-height)] w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-transparent text-sm transition-[border-color,box-shadow,background-color] duration-150",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40",
        "dark:bg-input/20 dark:hover:bg-input/30",
        disabled && "pointer-events-none cursor-not-allowed opacity-60",
        ariaInvalid &&
          "border-destructive ring-[3px] ring-destructive/25 dark:aria-invalid:border-destructive/50",
        className,
      )}
      aria-invalid={ariaInvalid}
    >
      <div className="flex shrink-0 items-center border-r border-input/80 bg-muted/20 dark:bg-input/10">
        <CountryDialSelect
          value={dialCode}
          onChange={handleDialCodeChange}
          disabled={disabled}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-0.5 pr-1">
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={nationalDigits}
          onChange={(e) => handleNationalChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-full min-w-0 flex-1 border-0 bg-transparent px-3 py-0 text-sm outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-0",
            "disabled:cursor-not-allowed",
          )}
          aria-label="Phone number"
        />
        {showClear && nationalDigits && !disabled ? (
          <IconButton
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Clear phone number"
          >
            <X className="size-3.5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
