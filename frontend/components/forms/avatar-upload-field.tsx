"use client";

import { useRef } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { User } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_BYTES = 512 * 1024;

async function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 512 KB or smaller");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export interface AvatarUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
}

export function AvatarUploadField<T extends FieldValues>({
  control,
  name,
  label = "Profile picture",
  disabled,
}: AvatarUploadFieldProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted",
              )}
            >
              {field.value ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={field.value}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <FormControl>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={disabled}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await readImageAsDataUrl(file);
                      field.onChange(dataUrl);
                    } catch (err) {
                      field.onChange("");
                      toast.error(
                        err instanceof Error ? err.message : "Invalid image",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </FormControl>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                >
                  Upload photo
                </Button>
                {field.value ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => field.onChange("")}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <FormDescription>JPG, PNG, or WebP up to 512 KB.</FormDescription>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
