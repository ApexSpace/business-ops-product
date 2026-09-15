import {
  FormsHostProvider,
  PLATFORM_FORMS_HOST,
} from "@/features/forms/forms-host-context";
import { FormSubmissionsPage } from "@/features/forms/pages/form-submissions-page";

export default async function PlatformFormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FormsHostProvider value={PLATFORM_FORMS_HOST}>
      <FormSubmissionsPage formId={id} />
    </FormsHostProvider>
  );
}
