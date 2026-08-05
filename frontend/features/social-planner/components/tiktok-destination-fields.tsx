"use client";

import { Label } from "@/components/ui/label";
import { useTikTokCreatorInfo } from "@/features/social-planner/hooks/use-tiktok-creator-info";
import { cn } from "@/lib/utils";

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

type TikTokDestinationFieldsProps = {
  resourceId?: string | null;
  platformPayload: Record<string, unknown>;
  onChange: (platformPayload: Record<string, unknown>) => void;
};

export function TikTokDestinationFields({
  resourceId,
  platformPayload,
  onChange,
}: TikTokDestinationFieldsProps) {
  const { data: creator, isLoading, isError, error } =
    useTikTokCreatorInfo(resourceId);

  const privacyLevel = String(platformPayload.privacyLevel ?? "");
  const commercialDisclosure = Boolean(platformPayload.commercialDisclosure);
  const brandOrganic = Boolean(platformPayload.brandOrganic);
  const brandedContent = Boolean(platformPayload.brandedContent);
  const disableComment = Boolean(platformPayload.disableComment);
  const disableDuet = Boolean(platformPayload.disableDuet);
  const disableStitch = Boolean(platformPayload.disableStitch);

  const privacyOptions = creator?.privacyLevelOptions?.length
    ? creator.privacyLevelOptions
    : ["SELF_ONLY"];

  const patch = (partial: Record<string, unknown>) => {
    const next = { ...platformPayload, ...partial };
    if (creator) {
      next._privacyLevelOptions = creator.privacyLevelOptions;
      next._maxDurationSec = creator.maxVideoPostDurationSec;
      next._commentDisabled = creator.commentDisabled;
      next._duetDisabled = creator.duetDisabled;
      next._stitchDisabled = creator.stitchDisabled;
    }
    onChange(next);
  };

  const brandedBlocksSelfOnly = brandedContent && privacyLevel === "SELF_ONLY";
  const disclosureIncomplete =
    commercialDisclosure && !brandOrganic && !brandedContent;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border p-3">
        {creator?.creatorAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.creatorAvatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs">
            TT
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {isLoading
              ? "Loading TikTok creator…"
              : creator?.creatorNickname || "TikTok account"}
          </p>
          {creator?.creatorUsername ? (
            <p className="truncate text-xs text-muted-foreground">
              @{creator.creatorUsername}
            </p>
          ) : null}
          {isError ? (
            <p className="text-xs text-red-600">
              {error instanceof Error
                ? error.message
                : "Could not load creator info"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Who can view this video <span className="text-red-600">*</span>
        </Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={privacyLevel}
          onChange={(e) => {
            const value = e.target.value;
            const next: Record<string, unknown> = { privacyLevel: value };
            if (value === "SELF_ONLY" && brandedContent) {
              next.brandedContent = false;
            }
            patch(next);
          }}
        >
          <option value="">Select…</option>
          {privacyOptions.map((value) => {
            const disabled = brandedContent && value === "SELF_ONLY";
            return (
              <option key={value} value={value} disabled={disabled}>
                {PRIVACY_LABELS[value] ?? value}
                {disabled ? " (not available for branded content)" : ""}
              </option>
            );
          })}
        </select>
        <p className="text-xs text-muted-foreground">
          No default — you must choose a privacy level. Pre-audit apps often
          only allow Only me.
        </p>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={commercialDisclosure}
            onChange={(e) => {
              const on = e.target.checked;
              patch({
                commercialDisclosure: on,
                ...(on ? {} : { brandOrganic: false, brandedContent: false }),
              });
            }}
          />
          Disclose commercial content
        </label>
        <p className="text-xs text-muted-foreground">
          Indicate whether this content promotes yourself, a brand, product, or
          service. Off by default.
        </p>
        {commercialDisclosure ? (
          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={brandOrganic}
                onChange={(e) => patch({ brandOrganic: e.target.checked })}
              />
              Your brand
            </label>
            <p className="pl-6 text-xs text-muted-foreground">
              Your video will be labeled as promoting your own brand.
            </p>
            <label
              className={cn(
                "flex items-center gap-2 text-sm",
                privacyLevel === "SELF_ONLY" && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={brandedContent}
                disabled={privacyLevel === "SELF_ONLY"}
                onChange={(e) => patch({ brandedContent: e.target.checked })}
              />
              Branded content
            </label>
            <p className="pl-6 text-xs text-muted-foreground">
              {privacyLevel === "SELF_ONLY"
                ? "Branded content visibility cannot be set to Only me."
                : "Your video will be labeled as Paid partnership."}
            </p>
            {disclosureIncomplete ? (
              <p className="text-xs text-red-600">
                You need to indicate if your content promotes yourself, a third
                party, or both.
              </p>
            ) : null}
            {brandedBlocksSelfOnly ? (
              <p className="text-xs text-red-600">
                Branded content cannot use Only me privacy.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Interaction settings</Label>
        <label
          className={cn(
            "flex items-center gap-2 text-sm",
            creator?.commentDisabled && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={disableComment || Boolean(creator?.commentDisabled)}
            disabled={Boolean(creator?.commentDisabled)}
            onChange={(e) => patch({ disableComment: e.target.checked })}
          />
          Disable comments
        </label>
        <label
          className={cn(
            "flex items-center gap-2 text-sm",
            creator?.duetDisabled && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={disableDuet || Boolean(creator?.duetDisabled)}
            disabled={Boolean(creator?.duetDisabled)}
            onChange={(e) => patch({ disableDuet: e.target.checked })}
          />
          Disable duet
        </label>
        <label
          className={cn(
            "flex items-center gap-2 text-sm",
            creator?.stitchDisabled && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            checked={disableStitch || Boolean(creator?.stitchDisabled)}
            disabled={Boolean(creator?.stitchDisabled)}
            onChange={(e) => patch({ disableStitch: e.target.checked })}
          />
          Disable stitch
        </label>
      </div>

      {creator?.maxVideoPostDurationSec ? (
        <p className="text-xs text-muted-foreground">
          Max video length for this account: {creator.maxVideoPostDurationSec}s
        </p>
      ) : null}
    </div>
  );
}
