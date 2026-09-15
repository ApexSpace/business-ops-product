"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy");
  }
}

type CopyFieldProps = {
  label: string;
  value: string;
  copyLabel?: string;
  multiline?: boolean;
};

export function CopyField({
  label,
  value,
  copyLabel = label,
  multiline = false,
}: CopyFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {multiline ? (
          <Textarea
            readOnly
            rows={5}
            value={value}
            className="font-mono text-xs"
          />
        ) : (
          <Input readOnly value={value} />
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copy ${copyLabel}`}
          onClick={() => void copyText(value, copyLabel)}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export { copyText };
