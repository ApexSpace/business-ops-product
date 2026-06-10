"use client";

import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { getAccessBlockedMessage } from "@/components/business-access/business-access-messages";
import Link from "next/link";
import {
  getBookCallHref,
  getSupportHref,
  getSupportMailto,
} from "@/lib/config/support";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function BusinessBillingSettings() {
  const { access, isLoading } = useBusinessAccess();

  if (isLoading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <PageHeader description="Your subscription and plan details." />
        <p className="text-sm text-muted-foreground">Loading plan details…</p>
      </div>
    );
  }

  const sub = access?.subscription;
  const blockedCopy =
    access && !access.canAccessWorkspace
      ? getAccessBlockedMessage(access.reasonCode)
      : null;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader description="Your subscription and plan details." />

      {blockedCopy ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">{blockedCopy.title}</CardTitle>
            <CardDescription>{blockedCopy.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Package assigned to this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plan group</span>
              <span>{sub?.planGroupName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plan tier</span>
              <span>{sub?.planTierName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subscription status</span>
              <Badge variant="secondary">{formatLabel(sub?.status)}</Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Access status</span>
              <span>{access?.reasonLabel ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing period</CardTitle>
            <CardDescription>Payment method and renewal dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment method</span>
              <span>{formatLabel(sub?.paymentMethod)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Payment status</span>
              <span>{formatLabel(sub?.paymentStatus)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current period ends</span>
              <span>{formatDate(sub?.currentPeriodEnd)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <span>
                {sub?.amount && sub.currency
                  ? `${sub.currency} ${sub.amount}`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Included capabilities</CardTitle>
          <CardDescription>
            Features enabled for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {access?.effectiveCapabilities.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {access.effectiveCapabilities.map((cap) => (
                <li
                  key={cap.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{cap.name}</p>
                  {cap.description ? (
                    <p className="text-muted-foreground">{cap.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No capabilities are assigned yet.
            </p>
          )}
        </CardContent>
      </Card>

      {access?.warnings.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {access.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<a href={getSupportHref()} />}>
          Contact support
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={getSupportMailto("Request plan upgrade")} />}
        >
          Request upgrade
        </Button>
        {getBookCallHref() ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={getBookCallHref()!}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Book call
          </Button>
        ) : null}
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/business/dashboard" />}
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
