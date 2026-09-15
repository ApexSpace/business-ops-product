"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type PinterestDestinationFieldsProps = {
  resourceName?: string | null;
  platformPayload: Record<string, unknown>;
  onChange: (platformPayload: Record<string, unknown>) => void;
};

export function PinterestDestinationFields({
  resourceName,
  platformPayload,
  onChange,
}: PinterestDestinationFieldsProps) {
  const title = String(platformPayload.title ?? "");
  const link = String(platformPayload.link ?? "");
  const altText = String(platformPayload.altText ?? "");

  const patch = (partial: Record<string, unknown>) => {
    onChange({
      ...platformPayload,
      ...partial,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium">
          Pin
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {resourceName || "Pinterest board"}
          </p>
          <p className="text-xs text-muted-foreground">
            One image or video pin. Description uses the shared caption above.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin-title">Title *</Label>
        <Input
          id="pin-title"
          maxLength={100}
          value={title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Pin title"
        />
        <p className="text-xs text-muted-foreground">{title.length}/100</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin-link">Destination link</Label>
        <Input
          id="pin-link"
          type="url"
          value={link}
          onChange={(e) => patch({ link: e.target.value })}
          placeholder="https://example.com/product"
        />
        <p className="text-xs text-muted-foreground">
          Optional clickthrough URL when someone opens the pin.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin-alt">Alt text</Label>
        <Input
          id="pin-alt"
          maxLength={500}
          value={altText}
          onChange={(e) => patch({ altText: e.target.value })}
          placeholder="Describe the image or video for accessibility"
        />
        <p className="text-xs text-muted-foreground">{altText.length}/500</p>
      </div>
    </div>
  );
}
