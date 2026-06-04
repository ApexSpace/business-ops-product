"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import type { z } from "zod";
import { Label } from "@/components/ui/label";
import { isZodFieldRequired } from "@/lib/forms/zod-required";
import { cn } from "@/lib/utils";

const FormSchemaContext = React.createContext<z.ZodTypeAny | null>(null);

function FormSchemaProvider({
  schema,
  children,
}: {
  schema: z.ZodTypeAny;
  children: React.ReactNode;
}) {
  return (
    <FormSchemaContext.Provider value={schema}>
      {children}
    </FormSchemaContext.Provider>
  );
}

function useFormSchema() {
  return React.useContext(FormSchemaContext);
}

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const fieldName = fieldContext?.name;

  if (!fieldName) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const formState = useFormState({ name: fieldName });
  const fieldState = getFieldState(fieldName, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldName,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-1.5", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label>) {
  const schema = useFormSchema();
  const { error, formItemId, name } = useFormField();
  const showRequired =
    required ?? (schema ? isZodFieldRequired(schema, name) : false);

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      required={showRequired}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
    </Label>
  );
}

function FormControl({
  children,
}: {
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return React.cloneElement(children, {
    id: formItemId,
    "aria-describedby": !error
      ? `${formDescriptionId}`
      : `${formDescriptionId} ${formMessageId}`,
    "aria-invalid": !!error,
  } as Record<string, unknown>);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useFormField,
  useFormSchema,
  Form,
  FormSchemaProvider,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
