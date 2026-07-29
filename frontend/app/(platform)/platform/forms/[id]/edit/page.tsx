import {
  FormsHostProvider,
  PLATFORM_FORMS_HOST,
} from "@/features/forms/forms-host-context";
import { FormBuilderPage } from "@/features/forms/pages/form-builder-page";

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
