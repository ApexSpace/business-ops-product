"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { CategoryDetailsPanel } from "@/features/services/components/settings/category-details-panel";
import { ServiceCreateForm } from "@/features/services/components/settings/service-create-form";
import { ServiceWorkspacePanel } from "@/features/services/components/settings/service-workspace-panel";
import { ServicesSidebar } from "@/features/services/components/settings/services-sidebar";
import { useServiceCatalogMutations } from "@/features/services/hooks/use-service-catalog-mutations";
import { useServicesTree } from "@/features/services/hooks/use-services-tree";
import {
  DURATION_PRESETS,
  type ServicesSelection,
} from "@/features/services/types/selection";
import { SETTINGS_FORM_SURFACE_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

function parseSelection(
  categoryId: string | null,
  serviceId: string | null,
): ServicesSelection {
  if (serviceId) return { type: "service", id: serviceId };
  if (categoryId) return { type: "category", id: categoryId };
  return null;
}

export function ServicesSettingsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null);
  const [selection, setSelection] = useState<ServicesSelection>(() =>
    parseSelection(
      searchParams.get("category"),
      searchParams.get("service"),
    ),
  );

  const tree = useServicesTree(search);
  const mutations = useServiceCatalogMutations();

  const syncUrl = useCallback(
    (next: ServicesSelection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      params.delete("service");
      if (next?.type === "category") params.set("category", next.id);
      if (next?.type === "service") params.set("service", next.id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const select = useCallback(
    (next: ServicesSelection) => {
      setCreateCategoryId(null);
      setSelection(next);
      syncUrl(next);
    },
    [syncUrl],
  );

  useEffect(() => {
    const fromUrl = parseSelection(
      searchParams.get("category"),
      searchParams.get("service"),
    );
    setSelection((prev) => {
      if (
        prev?.type === fromUrl?.type &&
        prev?.id === fromUrl?.id
      ) {
        return prev;
      }
      return fromUrl;
    });
  }, [searchParams]);

  const selectedCategory =
    selection?.type === "category"
      ? tree.filteredCategories.find((c) => c.id === selection.id) ??
        tree.categories.find((c) => c.id === selection.id)
      : null;

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card",
        SETTINGS_FORM_SURFACE_CLASS,
      )}
    >
      <ServicesSidebar
        search={search}
        onSearchChange={setSearch}
        filteredCategories={tree.filteredCategories}
        isLoading={tree.isLoading}
        isRefetching={tree.isRefetching}
        isError={tree.isError}
        error={tree.error}
        onRetry={() => void tree.refetch()}
        selection={selection}
        onSelectCategory={(id) => select({ type: "category", id })}
        onSelectService={(id) => select({ type: "service", id })}
        onAddService={(categoryId) => {
          setCreateCategoryId(categoryId);
          setSelection(null);
          syncUrl(null);
        }}
        onCreateCategory={async (name) => {
          const created = await mutations.createCategory.mutateAsync({ name });
          select({ type: "category", id: created.id });
        }}
        onDeleteCategory={(id) => {
          mutations.removeCategory.mutate(id, {
            onSuccess: () => {
              if (selection?.type === "category" && selection.id === id) {
                select(null);
              }
            },
          });
        }}
        onReorderCategories={(orderedIds) =>
          mutations.reorderCategories.mutate(orderedIds)
        }
        onReorderServices={(categoryId, orderedIds) =>
          mutations.reorderServices.mutate({ categoryId, orderedIds })
        }
        createCategoryPending={mutations.createCategory.isPending}
      />

      <main className="min-w-0 flex-1 overflow-y-auto p-[var(--settings-content-padding-y)] px-[var(--settings-content-padding-x)]">
        {tree.isError ? (
          <ApiErrorState
            error={tree.error}
            title="Could not load your service catalog"
            onRetry={() => void tree.refetch()}
          />
        ) : createCategoryId ? (
          <ServiceCreateForm
            categoryId={createCategoryId}
            categoryName={
              tree.categories.find((c) => c.id === createCategoryId)?.name ?? ""
            }
            durationPresets={[...DURATION_PRESETS]}
            isPending={mutations.createService.isPending}
            onCancel={() => setCreateCategoryId(null)}
            onSubmit={(body) =>
              mutations.createService.mutate(body, {
                onSuccess: (service) => {
                  setCreateCategoryId(null);
                  select({ type: "service", id: service.id });
                },
              })
            }
          />
        ) : selection?.type === "service" ? (
          <ServiceWorkspacePanel
            serviceId={selection.id}
            durationPresets={[...DURATION_PRESETS]}
            onUpdated={() => void tree.refetch()}
            onDeleted={() => select(null)}
          />
        ) : selectedCategory ? (
          <CategoryDetailsPanel
            category={selectedCategory}
            isSaving={mutations.updateCategory.isPending}
            onSave={async (name) => {
              await mutations.updateCategory.mutateAsync({
                id: selectedCategory.id,
                body: { name },
              });
            }}
            onDelete={() => {
              mutations.removeCategory.mutate(selectedCategory.id, {
                onSuccess: () => select(null),
              });
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold">Manage your services</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Select a category or service, or add a new one from the sidebar.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
