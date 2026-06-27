"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Search, Settings, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateMemberships } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  createClientMembership,
  exportClientMemberships,
  getClientMembership,
  listClientMemberships,
  listMembershipPlans,
  updateClientMembership,
} from "@/features/memberships/api/memberships.api";
import type {
  ClientMembershipListItem,
  ClientMembershipStatus,
} from "@/features/memberships/types";

function planLabel(item: ClientMembershipListItem) {
  return `${item.plan.emoji ?? ""} ${item.plan.name}`.trim();
}

function statusColor(status: ClientMembershipStatus) {
  switch (status) {
    case "ACTIVE":
    case "SCHEDULED":
      return "bg-emerald-500";
    case "PAST_DUE":
      return "bg-amber-500";
    case "UNPAID":
    case "CANCELED":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

export function MembershipsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all_except_canceled");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [showDifferentVersionsOnly, setShowDifferentVersionsOnly] =
    useState(false);
  const [showOlderUnpaid, setShowOlderUnpaid] = useState(false);

  const filters = {
    search: search || undefined,
    status: statusFilter as ClientMembershipStatus | "all_except_canceled",
    planId: planFilter === "all" ? undefined : planFilter,
    ...(showDifferentVersionsOnly ? { showDifferentVersionsOnly: true } : {}),
    ...(showOlderUnpaid ? { showOlderUnpaid: true } : {}),
  };

  const listQuery = useQuery({
    queryKey: queryKeys.memberships.clientList(filters),
    queryFn: () => listClientMemberships(filters),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.memberships.clientDetail(selectedId ?? ""),
    queryFn: () => getClientMembership(selectedId!),
    enabled: !!selectedId,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.memberships.plans(),
    queryFn: () => listMembershipPlans(),
    enabled: addOpen || optionsOpen,
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", "picker", addOpen],
    queryFn: () => listContacts({ page: 1, limit: 100 }),
    enabled: addOpen,
  });

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.items ?? []).map((c) => ({
        value: c.id,
        label:
          c.displayName?.trim() ||
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.email ||
          "Unknown",
      })),
    [contactsQuery.data],
  );

  const planOptions = useMemo(
    () =>
      (plansQuery.data ?? [])
        .filter((p) => !p.isArchived)
        .map((p) => ({
          value: p.id,
          label: `${p.emoji ?? ""} ${p.name}`.trim(),
        })),
    [plansQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createClientMembership,
    onSuccess: async (row) => {
      toast.success("Membership started");
      setAddOpen(false);
      await invalidateMemberships(queryClient);
      router.push(`/business/memberships?selected=${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "pause" | "resume" | "cancel";
    }) => updateClientMembership(id, { action }),
    onSuccess: async () => {
      toast.success("Membership updated");
      await invalidateMemberships(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleExport() {
    try {
      const blob = await exportClientMemberships(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "client-memberships.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (listQuery.isError) {
    return <ApiErrorState error={listQuery.error} onRetry={listQuery.refetch} />;
  }

  const detail = detailQuery.data;

  return (
    <div className="flex gap-6">
      <div className={cn("min-w-0 flex-1", selectedId && "lg:max-w-[60%]")}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Membership
          </Button>
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              className="pl-9"
              placeholder="Search by client or plan"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="ghost" nativeButton={false} render={<Link href="/business/memberships/plans" />}>
            Manage plans
          </Button>
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/business/memberships/settings" />}>
            <Settings className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => setOptionsOpen(true)}>
            <SlidersHorizontal className="mr-2 size-4" />
            Options
          </Button>
        </div>

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Start Date</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/50 cursor-pointer border-b",
                    selectedId === row.id && "bg-muted/50",
                  )}
                  onClick={() =>
                    router.push(`/business/memberships?selected=${row.id}`)
                  }
                >
                  <td className="p-3">{row.contact.name}</td>
                  <td className="p-3">{planLabel(row)}</td>
                  <td className="p-3">{formatListDate(row.startDate)}</td>
                  <td className="p-3">
                    ${row.price} / {row.billingIntervalUnit.toLowerCase().slice(0, 1)}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="gap-1.5">
                      <span
                        className={cn("size-2 rounded-full", statusColor(row.status))}
                      />
                      {row.status.replace("_", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listQuery.data?.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center">
              No memberships found.
            </p>
          ) : null}
        </div>
      </div>

      {selectedId && detail ? (
        <aside className="w-full max-w-md shrink-0 space-y-4 rounded-lg border p-4">
          <div>
            <h2 className="text-lg font-semibold">{planLabel(detail)}</h2>
            <p className="text-muted-foreground text-sm">{detail.contact.name}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {detail.status}
            </p>
            <p>
              <span className="text-muted-foreground">Price:</span> ${detail.price}
              / month
            </p>
            {detail.nextBillingDate ? (
              <p>
                <span className="text-muted-foreground">Next billing:</span>{" "}
                {formatListDate(detail.nextBillingDate)}
              </p>
            ) : null}
          </div>
          {detail.usageRecords.map((record) => (
            <div key={record.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                {record.totalSlots - record.usedSlots} / {record.totalSlots}{" "}
                remaining
              </p>
              <p className="text-muted-foreground">{record.services.join(", ")}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {detail.status === "ACTIVE" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  actionMutation.mutate({ id: detail.id, action: "pause" })
                }
              >
                Pause
              </Button>
            ) : null}
            {detail.status === "PAUSED" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  actionMutation.mutate({ id: detail.id, action: "resume" })
                }
              >
                Resume
              </Button>
            ) : null}
            {detail.status !== "CANCELED" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  actionMutation.mutate({ id: detail.id, action: "cancel" })
                }
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </aside>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <SearchableSelect
                items={contactOptions}
                value={contactId}
                onValueChange={setContactId}
                placeholder="Search for client"
                inDialog
              />
            </div>
            <div className="space-y-2">
              <Label>Membership plan</Label>
              <SearchableSelect
                items={planOptions}
                value={planId}
                onValueChange={setPlanId}
                placeholder="Select a plan"
                inDialog
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!contactId || !planId || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  contactId: contactId!,
                  planId: planId!,
                })
              }
            >
              Start Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v ?? "all_except_canceled")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_except_canceled">
                    All (except Canceled)
                  </SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Membership plan</Label>
              <Select
                value={planFilter}
                onValueChange={(v) => setPlanFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(plansQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show different versions only</Label>
              <Switch
                checked={showDifferentVersionsOnly}
                onCheckedChange={setShowDifferentVersionsOnly}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show older unpaid (over 1 month)</Label>
              <Switch
                checked={showOlderUnpaid}
                onCheckedChange={setShowOlderUnpaid}
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 size-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
