"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listPlatformAddons } from "@/features/platform/api/addons.api";

export function PlatformAddonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "addons"],
    queryFn: () => listPlatformAddons({ limit: 100 }),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add-ons</h1>
          <p className="text-sm text-muted-foreground">
            Independent add-ons can be purchased separately. Dependent add-ons
            must be linked to one or more tiers and are never sold alone.
          </p>
        </div>
        <Link
          href="/platform/addons/new"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <Plus className="mr-2 size-4" />
          New add-on
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.items ?? []).map((addon) => (
            <Link key={addon.id} href={`/platform/addons/${addon.id}`}>
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{addon.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge
                      variant={
                        addon.purchaseMode === "DEPENDENT"
                          ? "outline"
                          : "default"
                      }
                    >
                      {addon.purchaseMode}
                    </Badge>
                    <Badge variant="secondary">{addon.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {addon.purchaseMode === "INDEPENDENT" ? (
                    <p>
                      {addon.priceMonthly
                        ? `$${addon.priceMonthly}/mo`
                        : "No price"}
                    </p>
                  ) : (
                    <p>
                      Linked tiers:{" "}
                      {addon.tierLinks.map((t) => t.name).join(", ") || "None"}
                    </p>
                  )}
                  <p>Capability: {addon.capability.name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(data?.items?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              No add-ons yet. Create SMS, Forms, or other modules here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
