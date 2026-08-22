"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import {
  invalidateServiceCategories,
  invalidateServiceWorkspace,
} from "@/lib/query/invalidation";
import { createServiceCategory } from "@/features/services/api/service-categories.api";
import { getServicesTree } from "@/features/services/api/service-workspace.api";
import { createService } from "@/features/settings/api/services.api";
import { ServiceCreateForm } from "@/features/services/components/settings/service-create-form";
import { ServiceWorkspacePanel } from "@/features/services/components/settings/service-workspace-panel";

const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120];

function isTransientBackendError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return (
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.code === "BACKEND_UNAVAILABLE" ||
    error.code === "SERVICE_TIMEOUT"
  );
}

export function ServicesSettingsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const {
    data: tree,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.services.tree(),
    queryFn: getServicesTree,
    retry: (failureCount, err) =>
      isTransientBackendError(err) ? failureCount < 4 : failureCount < 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createServiceCategory({ name: newCategoryName.trim() }),
    onSuccess: () => {
      toast.success("Category created");
      setNewCategoryName("");
      void invalidateServiceCategories(queryClient);
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createService(body),
    onSuccess: (service) => {
      toast.success("Service created");
      setCreateCategoryId(null);
      setSelectedServiceId(service.id);
      void invalidateServiceCategories(queryClient);
    },
  });

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!tree?.categories) return [];
    if (!q) return tree.categories;
    return tree.categories
      .map((cat) => ({
        ...cat,
        services: cat.services.filter((s) =>
          s.name.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes(q) || cat.services.length > 0,
      );
  }, [tree, search]);

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card">
      <aside className="flex w-72 shrink-0 flex-col border-r bg-muted/20">
        <div className="space-y-2 border-b p-3">
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              const name = newCategoryName.trim();
              if (!name) {
                toast.error("Enter a category name below first");
                return;
              }
              createCategoryMutation.mutate();
            }}
            disabled={createCategoryMutation.isPending}
          >
            <Plus className="mr-2 size-4" />
            Add category
          </Button>
          <div className="space-y-1.5">
            <Label htmlFor="new-category-name" className="text-xs">
              Category name
            </Label>
            <Input
              id="new-category-name"
              placeholder="e.g. Hair"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const name = newCategoryName.trim();
                  if (name) createCategoryMutation.mutate();
                }
              }}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading || isRefetching ? (
            <LoadingState variant="inline" className="p-2" />
          ) : isError ? (
            <ApiErrorState
              compact
              className="m-2"
              error={error}
              title="Could not load services"
              onRetry={() => void refetch()}
            />
          ) : filteredCategories.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">
              No categories yet. Add one to get started.
            </p>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="mb-4">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category.name}
                </p>
                <ul className="space-y-0.5">
                  {category.services.map((service) => (
                    <li key={service.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                          selectedServiceId === service.id && "bg-muted",
                        )}
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setCreateCategoryId(null);
                        }}
                      >
                        <span>{service.name}</span>
                        {service.isDemo ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Demo
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full justify-start text-primary"
                  onClick={() => {
                    setCreateCategoryId(category.id);
                    setSelectedServiceId(null);
                  }}
                >
                  <Plus className="mr-1 size-3" />
                  Add service
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        {isError ? (
          <ApiErrorState
            error={error}
            title="Could not load your service catalog"
            onRetry={() => void refetch()}
          />
        ) : createCategoryId ? (
          <ServiceCreateForm
            categoryId={createCategoryId}
            categoryName={
              filteredCategories.find((c) => c.id === createCategoryId)?.name ??
              ""
            }
            durationPresets={DURATION_PRESETS}
            isPending={createServiceMutation.isPending}
            onCancel={() => setCreateCategoryId(null)}
            onSubmit={(body) => createServiceMutation.mutate(body)}
          />
        ) : selectedServiceId ? (
          <ServiceWorkspacePanel
            serviceId={selectedServiceId}
            durationPresets={DURATION_PRESETS}
            onUpdated={() =>
              void invalidateServiceWorkspace(queryClient, selectedServiceId)
            }
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold">Manage your services</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create categories and services, then configure staff, resources,
              customizations, and online booking for each service.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
