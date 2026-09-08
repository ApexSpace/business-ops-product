"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPlatformPaymentsMode,
  listPlatformPayments,
  updatePlatformPaymentsMode,
  type PlatformPaymentHubSource,
} from "@/features/platform/api/platform-payments.api";
import { queryKeys } from "@/lib/query/keys";

function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PlatformPaymentsHubPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<PlatformPaymentHubSource | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const filters = {
    page,
    limit: 25,
    ...(source !== "ALL" ? { source } : {}),
    ...(search ? { q: search } : {}),
  };

  const query = useQuery({
    queryKey: queryKeys.platform.payments.list(filters),
    queryFn: () => listPlatformPayments(filters),
  });

  const modeQuery = useQuery({
    queryKey: ["platform", "payments", "mode"] as const,
    queryFn: getPlatformPaymentsMode,
  });

  const modeMutation = useMutation({
    mutationFn: (mode: "live" | "test") => updatePlatformPaymentsMode(mode),
    onSuccess: async () => {
      toast.success("Platform form payments mode updated");
      await modeQuery.refetch();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.platform.payments.all(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Hub for platform money: SaaS subscriptions and form Collect Payment
            charges, with source and context for each row.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Form payments mode
          </span>
          <Button
            type="button"
            size="sm"
            variant={
              modeQuery.data?.paymentsMode === "live" ? "brand" : "outline"
            }
            disabled={modeMutation.isPending}
            onClick={() => modeMutation.mutate("live")}
          >
            Live
          </Button>
          <Button
            type="button"
            size="sm"
            variant={
              modeQuery.data?.paymentsMode === "test" ? "brand" : "outline"
            }
            disabled={
              modeMutation.isPending ||
              modeQuery.data?.testModeConfigured === false
            }
            onClick={() => modeMutation.mutate("test")}
          >
            Test
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Source</label>
          <Select
            value={source}
            onValueChange={(value) => {
              setPage(1);
              setSource(value as PlatformPaymentHubSource | "ALL");
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              <SelectItem value="SAAS_SUBSCRIPTION">SaaS subscription</SelectItem>
              <SelectItem value="FORM">Form payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input
            className="w-[240px]"
            value={q}
            placeholder="Business, form, payer…"
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setSearch(q.trim());
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPage(1);
            setSearch(q.trim());
          }}
        >
          Search
        </Button>
      </div>

      {query.isLoading ? <LoadingState label="Loading payments…" /> : null}
      {query.isError ? (
        <p className="text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to load payments"}
        </p>
      ) : null}

      {!query.isLoading && !query.isError ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Context</th>
                <th className="px-3 py-2 font-medium">Payer</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2 font-medium">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No payments found.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(row.paidAt ?? row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.sourceLabel}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {row.contextHref ? (
                          <Link
                            href={row.contextHref}
                            className="underline-offset-2 hover:underline"
                          >
                            {row.contextTitle}
                          </Link>
                        ) : (
                          row.contextTitle
                        )}
                      </div>
                      {row.contextSubtitle ? (
                        <div className="text-xs text-muted-foreground">
                          {row.contextSubtitle}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div>{row.payerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.payerEmail || row.payerPhone || ""}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {row.livemode ? "Live" : "Test"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.externalPaymentId
                        ? `${row.externalPaymentId.slice(0, 18)}…`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {meta && meta.total > meta.limit ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} · {meta.total} total
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * meta.limit >= meta.total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
