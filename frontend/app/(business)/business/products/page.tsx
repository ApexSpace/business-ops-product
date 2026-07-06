import { Suspense } from "react";
import { ProductsWorkspace } from "@/features/products/components/products-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
          <Skeleton className="min-h-0 flex-1 rounded-xl" />
        </div>
      }
    >
      <ProductsWorkspace />
    </Suspense>
  );
}
