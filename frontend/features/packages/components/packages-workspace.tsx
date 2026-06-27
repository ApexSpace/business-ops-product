"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidatePackages } from "@/lib/query/invalidation";
import { listContacts } from "@/features/contacts/api/contacts.api";
import {
  adjustClientPackageQuantities,
  createClientPackage,
  deleteClientPackage,
  getClientPackage,
  listClientPackages,
  listPackageTemplates,
  transferClientPackage,
  updateClientPackageExpiration,
} from "@/features/packages/api/packages.api";
import type { ClientPackageListItem } from "@/features/packages/types";

function packageLabel(item: ClientPackageListItem) {
  const emoji = item.packageTemplate.emoji ?? "";
  return `${emoji} ${item.packageTemplate.name}`.trim();
}

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

function formatDetailDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d, yyyy");
}

export function PackagesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const contactFilter = searchParams.get("contact");
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [allocationDraft, setAllocationDraft] = useState<
    Record<string, number>
  >({});

  const [contactId, setContactId] = useState<string | null>(contactFilter);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isDemo, setIsDemo] = useState(false);
  const [transferContactId, setTransferContactId] = useState<string | null>(
    null,
  );
  const [expirationDraft, setExpirationDraft] = useState("");

  useEffect(() => {
    if (contactFilter) {
      setContactId(contactFilter);
      setAddOpen(true);
    }
  }, [contactFilter]);

  const listQuery = useQuery({
    queryKey: queryKeys.packages.clientList({ search }),
    queryFn: () => listClientPackages({ search: search || undefined }),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.packages.clientDetail(selectedId ?? ""),
    queryFn: () => getClientPackage(selectedId!),
    enabled: !!selectedId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.packages.templates(),
    queryFn: listPackageTemplates,
    enabled: addOpen,
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", "picker", addOpen || transferOpen],
    queryFn: () => listContacts({ page: 1, limit: 100 }),
    enabled: addOpen || transferOpen,
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

  const templateOptions = useMemo(
    () =>
      (templatesQuery.data ?? []).map((t) => ({
        value: t.id,
        label: `${t.emoji ?? ""} ${t.name}`.trim(),
      })),
    [templatesQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: createClientPackage,
    onSuccess: async (pkg) => {
      toast.success("Package added");
      setAddOpen(false);
      await invalidatePackages(queryClient);
      router.push(`/business/packages?selected=${pkg.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClientPackage,
    onSuccess: async () => {
      toast.success("Package deleted");
      router.push("/business/packages");
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMutation = useMutation({
    mutationFn: ({
      id,
      targetContactId,
    }: {
      id: string;
      targetContactId: string;
    }) => transferClientPackage(id, targetContactId),
    onSuccess: async () => {
      toast.success("Package transferred");
      setTransferOpen(false);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      id,
      allocations,
    }: {
      id: string;
      allocations: Array<{ serviceId: string; remaining: number }>;
    }) => adjustClientPackageQuantities(id, allocations),
    onSuccess: async () => {
      toast.success("Quantities updated");
      setAdjustMode(false);
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expirationMutation = useMutation({
    mutationFn: ({
      id,
      expirationDate,
    }: {
      id: string;
      expirationDate: string | null;
    }) => updateClientPackageExpiration(id, expirationDate),
    onSuccess: async () => {
      toast.success("Expiration updated");
      await invalidatePackages(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detail = detailQuery.data;

  function startAdjust() {
    if (!detail) return;
    const draft: Record<string, number> = {};
    for (const a of detail.serviceAllocations) {
      draft[a.serviceId] = a.remaining;
    }
    setAllocationDraft(draft);
    setAdjustMode(true);
  }

  if (listQuery.isError) {
    return <ApiErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Package
          </Button>
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              className="pl-9"
              placeholder="Search by name or client"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/business/packages/setup" />}
          >
            Package setup
          </Button>
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={
              <Link href="/business/packages/settings" aria-label="Settings" />
            }
          >
            <Settings className="size-4" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Client</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "cursor-pointer border-t hover:bg-muted/30",
                    selectedId === row.id && "bg-primary/5",
                  )}
                  onClick={() =>
                    router.push(`/business/packages?selected=${row.id}`)
                  }
                >
                  <td className="px-3 py-2">{row.contact.name}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      {packageLabel(row)}
                      {row.isDemo ? (
                        <Badge variant="secondary">Demo</Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.totalQty}</td>
                  <td className="px-3 py-2">{formatListDate(row.purchaseDate)}</td>
                </tr>
              ))}
              {!listQuery.isLoading && (listQuery.data ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground px-3 py-8 text-center"
                  >
                    No client packages yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-[380px]">
        {!selectedId || !detail ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Boxes className="text-muted-foreground mb-3 size-10" />
            <p className="text-muted-foreground text-sm">
              Add a new client package or select one from the list to view
              details.
            </p>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Package</h3>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(detail.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTransferOpen(true)}>
                    Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={startAdjust}>
                    Adjust Quantities
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{packageLabel(detail)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Client</p>
                <p>{detail.contact.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Purchase date</p>
                <p>{formatDetailDate(detail.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Expiration date</p>
                <div className="flex items-center gap-2">
                  <p>
                    {detail.expirationDate
                      ? formatDetailDate(detail.expirationDate)
                      : "No expiration date"}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setExpirationDraft(
                        detail.expirationDate
                          ? detail.expirationDate.slice(0, 10)
                          : "",
                      );
                      const next = prompt(
                        "Expiration date (YYYY-MM-DD) or leave empty for none:",
                        expirationDraft,
                      );
                      if (next === null) return;
                      expirationMutation.mutate({
                        id: detail.id,
                        expirationDate: next.trim() ? next.trim() : null,
                      });
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Services remaining</p>
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="py-1 text-left">Service</th>
                    <th className="py-1 text-right"># Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.serviceAllocations.map((a) => (
                    <tr key={a.serviceId} className="border-t">
                      <td className="py-2">{a.serviceName}</td>
                      <td className="py-2 text-right">
                        {adjustMode ? (
                          <Input
                            type="number"
                            min={0}
                            className="ml-auto h-8 w-20 text-right"
                            value={allocationDraft[a.serviceId] ?? a.remaining}
                            onChange={(e) =>
                              setAllocationDraft((prev) => ({
                                ...prev,
                                [a.serviceId]: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          a.remaining
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adjustMode ? (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustMode(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      adjustMutation.mutate({
                        id: detail.id,
                        allocations: detail.serviceAllocations.map((a) => ({
                          serviceId: a.serviceId,
                          remaining:
                            allocationDraft[a.serviceId] ?? a.remaining,
                        })),
                      })
                    }
                  >
                    Save
                  </Button>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">History</p>
              <ul className="text-muted-foreground max-h-40 space-y-2 overflow-y-auto text-xs">
                {detail.history.map((event) => (
                  <li key={event.id}>
                    <span className="text-foreground font-medium">
                      {event.eventType}
                    </span>
                    {event.description ? ` — ${event.description}` : ""}
                    <span className="block">
                      {formatDetailDate(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Package</DialogTitle>
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
              <Label>Package template</Label>
              <SearchableSelect
                items={templateOptions}
                value={templateId}
                onValueChange={setTemplateId}
                placeholder="Select package"
                inDialog
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase date</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="demo"
                checked={isDemo}
                onCheckedChange={(v) => setIsDemo(v === true)}
              />
              <Label htmlFor="demo">Mark as demo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!contactId || !templateId}
              onClick={() =>
                createMutation.mutate({
                  contactId: contactId!,
                  packageTemplateId: templateId!,
                  purchaseDate,
                  isDemo,
                })
              }
            >
              Add Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Transfer to</Label>
            <SearchableSelect
              items={contactOptions}
              value={transferContactId}
              onValueChange={setTransferContactId}
              placeholder="Search for client"
              inDialog
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!transferContactId || !selectedId}
              onClick={() =>
                transferMutation.mutate({
                  id: selectedId!,
                  targetContactId: transferContactId!,
                })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
