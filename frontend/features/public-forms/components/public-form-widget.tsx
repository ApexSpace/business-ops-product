"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FormRuntimeView } from "@/features/forms/components/form-runtime-view";
import { normalizeFormDefinition } from "@/features/forms/utils/form-normalize.util";
import {
  getPublicFormConfig,
  submitPublicForm,
} from "@/features/public-forms/api/public-forms.api";
import { ApiClientError } from "@/lib/api/errors";

const RESIZE_MESSAGE = "form-embed-widget:resize";

interface PublicFormWidgetProps {
  publicKey: string;
}

export function PublicFormWidget({ publicKey }: PublicFormWidgetProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const configQuery = useQuery({
    queryKey: ["public-form-config", publicKey],
    queryFn: () => getPublicFormConfig(publicKey),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      submitPublicForm(publicKey, data),
    onSuccess: (result) => {
      setSubmitted(true);
      setSubmitError(null);
      setFieldErrors({});
      if (result.redirectUrl) {
        window.setTimeout(() => {
          window.location.href = result.redirectUrl!;
        }, 1200);
      }
    },
    onError: (error: Error) => {
      if (error instanceof ApiClientError && error.fieldErrors) {
        const mapped = Object.fromEntries(
          Object.entries(error.fieldErrors).map(([field, messages]) => [
            field,
            messages[0] ?? "Invalid value",
          ]),
        );
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          setSubmitError(null);
          return;
        }
      }
      setFieldErrors({});
      setSubmitError(error.message || "Unable to submit the form. Please try again.");
    },
  });

  const definition = configQuery.data
    ? normalizeFormDefinition(configQuery.data.definition)
    : null;

  useEffect(() => {
    const reportHeight = () => {
      const height = Math.ceil(
        document.documentElement.scrollHeight || document.body.scrollHeight || 0,
      );
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: RESIZE_MESSAGE, height: Math.max(120, height) },
          "*",
        );
      }
    };

    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    observer.observe(document.body);
    window.addEventListener("resize", reportHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reportHeight);
    };
  }, [configQuery.isLoading, configQuery.isError, submitted, definition]);

  if (configQuery.isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (configQuery.isError || !definition) {
    return (
      <div className="rounded-lg p-6 text-center text-sm text-muted-foreground">
        This form is unavailable.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-svh bg-transparent p-4">
      <FormRuntimeView
        definition={definition}
        submitted={submitted}
        isSubmitting={submitMutation.isPending}
        submitError={submitError}
        fieldErrors={fieldErrors}
        onSubmit={async (data) => {
          setSubmitError(null);
          setFieldErrors({});
          await submitMutation.mutateAsync(data);
        }}
        onResetSubmitted={() => {
          setSubmitted(false);
          setSubmitError(null);
          setFieldErrors({});
        }}
      />
    </div>
  );
}
