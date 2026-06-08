"use client";

import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { emailVariableLabel } from "@/features/email-notifications/utils/email-template-editor-utils";
import { cn } from "@/lib/utils";

type EmailTemplateVariablePickerProps = {
  variables: string[];
  onInsert: (key: string) => void;
  className?: string;
  disabled?: boolean;
};

export function EmailTemplateVariablePicker({
  variables,
  onInsert,
  className,
  disabled,
}: EmailTemplateVariablePickerProps) {
  if (variables.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("size-8 text-muted-foreground", className)}
            aria-label="Insert dynamic field"
            disabled={disabled}
          >
            <Braces className="size-[18px]" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-64 w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Insert variable</DropdownMenuLabel>
          {variables.map((key) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onInsert(key)}
              className="flex flex-col items-start gap-0.5 py-2"
            >
              <span>
                {emailVariableLabel(key)}
                <span className="text-muted-foreground"> — </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {key}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
