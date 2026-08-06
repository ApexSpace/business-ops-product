import { api } from "@/lib/api/client";

export type TikTokCreatorInfo = {
  creatorAvatarUrl: string;
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec?: number;
};

export function getTikTokCreatorInfo(resourceId: string) {
  return api.get<TikTokCreatorInfo>("social-planner/tiktok/creator-info", {
    searchParams: { resourceId },
  });
}
