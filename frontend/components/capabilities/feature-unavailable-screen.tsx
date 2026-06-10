"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFeatureUnavailableMessage } from "@/components/business-access/business-access-messages";
import { getSupportHref } from "@/lib/config/support";

export function FeatureUnavailableScreen({ moduleKey }: { moduleKey: string }) {
  const message = getFeatureUnavailableMessage(moduleKey);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>{message.title}</CardTitle>
          <CardDescription>{message.message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button nativeButton={false} render={<a href={getSupportHref()} />}>
            {message.primaryCta}
          </Button>
          {message.secondaryCtas.includes("Go to dashboard") ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/business/dashboard" />}
            >
              Go to dashboard
            </Button>
          ) : null}
          {message.secondaryCtas.includes("View plan") ? (
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/business/settings/billing" />}
            >
              View plan
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
