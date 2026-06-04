import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
