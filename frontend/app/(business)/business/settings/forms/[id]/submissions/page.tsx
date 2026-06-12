import { use } from "react";
import { FormSubmissionsPage } from "@/features/forms/pages/form-submissions-page";

export default function BusinessFormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FormSubmissionsPage formId={id} />;
}
