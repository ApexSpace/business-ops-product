import { use } from "react";
import { FormBuilderPage } from "@/features/forms/pages/form-builder-page";

export default function BusinessFormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FormBuilderPage mode="edit" formId={id} />;
}
