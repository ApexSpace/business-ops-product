import { PublicFormWidget } from "@/features/public-forms/components/public-form-widget";

interface FormWidgetPageProps {
  params: Promise<{ publicKey: string }>;
}

export default async function FormWidgetPage({ params }: FormWidgetPageProps) {
  const { publicKey } = await params;

  return (
    <div className="min-h-svh bg-transparent p-0">
      <PublicFormWidget publicKey={publicKey} />
    </div>
  );
}
