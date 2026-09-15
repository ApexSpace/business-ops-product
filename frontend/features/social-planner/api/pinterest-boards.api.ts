import { api } from "@/lib/api/client";

export type CreatePinterestBoardInput = {
  name: string;
  description?: string;
};

export type PinterestBoardResource = {
  id: string;
  externalId: string;
  name: string;
  providerKey: string;
  type: string;
};

export function createPinterestBoard(input: CreatePinterestBoardInput) {
  return api.post<PinterestBoardResource>(
    "social-planner/pinterest/boards",
    input,
  );
}
