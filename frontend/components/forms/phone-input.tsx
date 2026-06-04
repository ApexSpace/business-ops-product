"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const country = getPhoneCountry(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) =>
        c.dialCode.includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.flag.includes(q),
    );
  }, [search]);

  const pick = (c: PhoneCountry) => {
    onChange(c.dialCode);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-full shrink-0 items-center gap-0.5 rounded-none border-0 bg-transparent px-2.5 text-sm font-medium outline-none",
          "hover:bg-muted/50 focus-visible:bg-muted/50",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        aria-label={`Country code ${country.dialCode}`}
      >
        <span className="text-base leading-none" aria-hidden>
          {country.flag}
        </span>
        <span className="tabular-nums text-foreground">{country.dialCode}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-72 flex-col gap-0 overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border/80 p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country…"
            className="h-8"
            autoFocus
          />
        </div>
        <div
          className="max-h-56 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label="Country codes"
        >
          <ul className="p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                No countries found
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.dialCode}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.dialCode === value}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      c.dialCode === value && "bg-accent/80",
                    )}
                    onClick={() => pick(c)}
                  >
                    <span className="shrink-0 text-base leading-none">
                      {c.flag}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {c.dialCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {c.label}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
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
