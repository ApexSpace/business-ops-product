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

interface BusinessFormEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessFormEditPage({
  params,
}: BusinessFormEditPageProps) {
  const { id } = await params;
  return <FormBuilderPage mode="edit" formId={id} />;
}
