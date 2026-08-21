"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialPostStatusBadge } from "@/features/social-planner/components/social-post-status-badge";
import { useSocialCalendar } from "@/features/social-planner/hooks/use-social-calendar";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function SocialPlannerCalendarPage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();
  const { data, isLoading, isError, error, refetch } = useSocialCalendar(
    from,
    to,
  );

  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>>();
    for (const post of data ?? []) {
      if (!post.scheduledAt) continue;
      const key = new Date(post.scheduledAt).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [data]);

  const daysInMonth = endOfMonth(month).getDate();
  const firstWeekday = startOfMonth(month).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Social Planner"
        description="Calendar of scheduled and published posts"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/business/social-planner/posts" />}
            >
              Posts list
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/business/social-planner/comments" />}
            >
              Engagement
            </Button>
            <ListPrimaryAction
              label="Compose"
              onClick={() => router.push("/business/social-planner/new")}
            />
          </>
        }
      />

      {isError ? (
        <ApiErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {month.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-24" />;
                }
                const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const posts = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className="min-h-24 rounded-md border border-border/60 p-1.5"
                  >
                    <div className="mb-1 text-xs font-medium">{day}</div>
                    <div className="space-y-1">
                      {posts.slice(0, 3).map((post) => (
                        <Link
                          key={post.id}
                          href={`/business/social-planner/${post.id}/edit`}
                          className="block truncate rounded bg-muted/60 px-1 py-0.5 text-[11px] hover:bg-muted"
                        >
                          <SocialPostStatusBadge
                            status={post.status}
                            className="mb-0.5"
                          />
                          <span className="block truncate">
                            {post.caption || "(no caption)"}
                          </span>
                        </Link>
                      ))}
                      {posts.length > 3 ? (
                        <div className="text-[10px] text-muted-foreground">
                          +{posts.length - 3} more
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {isLoading ? (
              <LoadingState
                variant="inline"
                label="Loading…"
                className="mt-3"
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
