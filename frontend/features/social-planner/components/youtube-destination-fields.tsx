"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useYouTubeCategories } from "@/features/social-planner/hooks/use-youtube-categories";
import { cn } from "@/lib/utils";

type YouTubeDestinationFieldsProps = {
  resourceName?: string | null;
  postType?: string;
  platformPayload: Record<string, unknown>;
  onChange: (platformPayload: Record<string, unknown>) => void;
};

const FALLBACK_CATEGORIES = [
  { id: "22", title: "People & Blogs" },
  { id: "24", title: "Entertainment" },
  { id: "27", title: "Education" },
  { id: "28", title: "Science & Technology" },
  { id: "10", title: "Music" },
  { id: "20", title: "Gaming" },
];

export function YouTubeDestinationFields({
  resourceName,
  postType,
  platformPayload,
  onChange,
}: YouTubeDestinationFieldsProps) {
  const { data: categories, isLoading } = useYouTubeCategories(true);
  const categoryOptions =
    categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const title = String(platformPayload.title ?? "");
  const privacyStatus = String(platformPayload.privacyStatus ?? "public");
  const madeForKids = Boolean(platformPayload.madeForKids);
  const categoryId = String(platformPayload.categoryId ?? "22");
  const tags = String(platformPayload.tags ?? "");
  const isShort = postType === "SHORT";

  const patch = (partial: Record<string, unknown>) => {
    onChange({
      ...platformPayload,
      ...partial,
      _allowedCategoryIds: categoryOptions.map((c) => c.id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium">
          YT
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {resourceName || "YouTube channel"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isShort
              ? "Shorts: keep video ≤ 60s and ideally vertical."
              : "Standard video upload to your connected channel."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="yt-title">Title *</Label>
        <Input
          id="yt-title"
          maxLength={100}
          value={title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Video title"
        />
        <p className="text-xs text-muted-foreground">{title.length}/100</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="yt-privacy">Privacy *</Label>
        <select
          id="yt-privacy"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={privacyStatus}
          onChange={(e) => patch({ privacyStatus: e.target.value })}
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={madeForKids}
            onChange={(e) => patch({ madeForKids: e.target.checked })}
          />
          Made for kids
        </Label>
        <p className="text-xs text-muted-foreground">
          Required by YouTube. Check only if this video is directed to children.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="yt-category">Category</Label>
        <select
          id="yt-category"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={categoryId}
          onChange={(e) => patch({ categoryId: e.target.value })}
          disabled={isLoading && !categories?.length}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="yt-tags">Tags</Label>
        <Input
          id="yt-tags"
          value={tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="tag1, tag2"
        />
      </div>

      <p
        className={cn(
          "text-xs",
          madeForKids === undefined
            ? "text-amber-600"
            : "text-muted-foreground",
        )}
      >
        Caption below becomes the YouTube description.
      </p>
    </div>
  );
}
