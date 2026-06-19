import { FormBuilderPage } from "@/features/forms/pages/form-builder-page";

interface BusinessFormEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessFormEditPage({
  params,
}: BusinessFormEditPageProps) {
  const { id } = await params;
  return <FormBuilderPage mode="edit" formId={id} />;
}
