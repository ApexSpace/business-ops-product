import { api } from "@/lib/api/client";

export type YouTubeCategory = {
  id: string;
  title: string;
};

export function listYouTubeCategories() {
  return api.get<YouTubeCategory[]>("social-planner/youtube/categories");
}
