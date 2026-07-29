"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listPlatformTiers } from "@/features/platform/api/tiers.api";

export function PlatformTiersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tiers"],
    queryFn: () => listPlatformTiers({ limit: 100 }),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tiers</h1>
          <p className="text-sm text-muted-foreground">
            Fixed packages with price, staff/location limits, capabilities, and
            included add-ons. No per-seat overage.
          </p>
        </div>
        <Link
          href="/platform/tiers/new"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <Plus className="mr-2 size-4" />
          New tier
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.items ?? []).map((tier) => (
            <Link key={tier.id} href={`/platform/tiers/${tier.id}`}>
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{tier.name}</CardTitle>
                  <Badge variant="secondary">{tier.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {tier.priceMonthly
                      ? `$${tier.priceMonthly}/mo`
                      : "No monthly price"}
                    {tier.priceYearly ? ` · $${tier.priceYearly}/yr` : ""}
                  </p>
                  <p>
                    Staff: {tier.staffLimit ?? "Unlimited"} · Locations:{" "}
                    {tier.locationLimit ?? "Unlimited"}
                  </p>
                  <p>
                    {tier.capabilities.length} capabilities ·{" "}
                    {tier.includedAddons.length} included ·{" "}
                    {tier.dependentAddons.length} dependent
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(data?.items?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              No tiers yet. Create your first Starter / Growth / Unlimited package.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
