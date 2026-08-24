"use client";

import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthPasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  visible: boolean;
  onToggleVisibility: () => void;
};

export function AuthPasswordInput({
  visible,
  onToggleVisibility,
  className,
  ref,
  ...props
}: AuthPasswordInputProps) {
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <IconButton
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground after:absolute after:inset-[-6px] hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={onToggleVisibility}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </IconButton>
    </div>
  );
}
