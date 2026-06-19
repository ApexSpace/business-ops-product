import { FormSubmissionsPage } from "@/features/forms/pages/form-submissions-page";

interface BusinessFormSubmissionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessFormSubmissionsPage({
  params,
}: BusinessFormSubmissionsPageProps) {
  const { id } = await params;
  return <FormSubmissionsPage formId={id} />;
}
