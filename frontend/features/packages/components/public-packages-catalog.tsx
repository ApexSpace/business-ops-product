"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicPackageCatalog } from "@/features/packages/api/packages.api";

export function PublicPackagesCatalog({ slug }: { slug: string }) {
  const catalogQuery = useQuery({
    queryKey: ["public-packages-catalog", slug],
    queryFn: () => getPublicPackageCatalog(slug),
  });

  if (catalogQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  const data = catalogQuery.data;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Packages are not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen p-4">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{data.business.name}</h1>
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Powered by CodeSol
          </p>
        </div>

        <div className="space-y-3">
          {data.packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {pkg.emoji} {pkg.name}
                  </p>
                  {pkg.shortDescription ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {pkg.shortDescription}
                    </p>
                  ) : null}
                </div>
                <p className="text-lg font-bold">${pkg.totalPrice}</p>
              </div>
              <Button
                className="mt-4 w-full"
                nativeButton={false}
                render={<Link href={`/packages/${slug}/${pkg.id}`} />}
              >
                View package
              </Button>
            </div>
          ))}
        </div>

        {!data.stripeReady ? (
          <p className="text-muted-foreground text-center text-sm">
            Online payments are not available at this time.
          </p>
        ) : null}
      </div>
    </div>
  );
}
