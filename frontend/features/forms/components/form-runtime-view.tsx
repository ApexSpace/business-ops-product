"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormDefinition } from "@/features/forms/types";
import { FieldRenderer } from "@/features/forms/components/builder/field-renderer";
import {
  getFormContainerClass,
  getFormContainerStyle,
  getSubmitButtonClass,
  getSubmitButtonStyle,
} from "@/features/forms/utils/field-style.util";
import {
  collectRuntimeFormData,
  mapSubmissionErrors,
  validateRuntimeFormSubmission,
} from "@/features/forms/utils/form-submission-validation.util";

interface FormRuntimeViewProps {
  definition: FormDefinition;
  submitted: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onResetSubmitted?: () => void;
  className?: string;
}

export function FormRuntimeView({
  definition,
  submitted,
  isSubmitting = false,
  submitError = null,
  fieldErrors: externalFieldErrors = {},
  onSubmit,
  onResetSubmitted,
  className,
}: FormRuntimeViewProps) {
  const { settings, fields } = definition;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const displayedFieldErrors = { ...fieldErrors, ...externalFieldErrors };

  return (
    <div
      className={cn("w-full", getFormContainerClass(settings), className)}
      style={getFormContainerStyle(settings)}
    >
      {submitted ? (
        <div className="space-y-4 py-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-green-600" />
          <p className="text-lg font-medium">{settings.successMessage}</p>
          {onResetSubmitted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetSubmitted}
            >
              Back to form
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-semibold">{settings.title}</h2>
            {settings.description ? (
              <p className="text-sm text-muted-foreground">{settings.description}</p>
            ) : null}
          </div>

          <form
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = collectRuntimeFormData(form, fields);
              const validationErrors = validateRuntimeFormSubmission(fields, data);
              if (validationErrors.length > 0) {
                setFieldErrors(mapSubmissionErrors(validationErrors));
                return;
              }

              setFieldErrors({});
              await onSubmit(data);
            }}
          >
            {submitError ? (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            <div className="space-y-1">
              {fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  settings={settings}
                  showRequiredIndicator={settings.showRequiredIndicator}
                  mode="preview"
                  interactive
                  fieldError={displayedFieldErrors[field.name]}
                  fieldErrors={displayedFieldErrors}
                />
              ))}
            </div>

            <div
              className={cn(
                "mt-8 flex",
                settings.submitButtonAlign === "center" && "justify-center",
                settings.submitButtonAlign === "right" && "justify-end",
              )}
            >
              <Button
                type="submit"
                disabled={isSubmitting}
                className={getSubmitButtonClass(settings)}
                style={getSubmitButtonStyle(settings)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  settings.submitButtonLabel
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
