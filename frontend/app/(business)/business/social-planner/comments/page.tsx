"use client";

import { Suspense } from "react";
import { SocialCommentsPage } from "@/features/social-planner/pages/social-comments-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground md:p-6">
          Loading engagement…
        </div>
      }
    >
      <SocialCommentsPage />
    </Suspense>
  );
}
