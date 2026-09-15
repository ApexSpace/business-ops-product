import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FormBuilderPage = dynamic(
  () =>
    import("@/features/forms/pages/form-builder-page").then(
      (m) => m.FormBuilderPage,
    ),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

export default function BusinessFormCreatePage() {
  return <FormBuilderPage mode="create" />;
}
