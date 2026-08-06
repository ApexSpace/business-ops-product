import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FormsHostProvider,
  PLATFORM_FORMS_HOST,
} from "@/features/forms/forms-host-context";

const FormBuilderPage = dynamic(
  () =>
    import("@/features/forms/pages/form-builder-page").then(
      (m) => m.FormBuilderPage,
    ),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

export default async function PlatformFormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FormsHostProvider value={PLATFORM_FORMS_HOST}>
      <FormBuilderPage mode="edit" formId={id} />
    </FormsHostProvider>
  );
}
