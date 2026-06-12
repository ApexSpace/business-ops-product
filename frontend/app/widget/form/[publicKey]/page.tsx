"use client";

import { use } from "react";
import { PublicFormWidget } from "@/features/public-forms/components/public-form-widget";

export default function FormWidgetPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = use(params);

  return (
    <div className="min-h-svh bg-transparent p-0">
      <PublicFormWidget publicKey={publicKey} />
    </div>
  );
}
