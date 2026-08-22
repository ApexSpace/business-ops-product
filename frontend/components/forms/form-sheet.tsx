"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { ActionButton } from "@/components/ui/action-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/forms/drawer-sheet";
import {
  FORM_DRAWER_CONTENT_CLASS,
  FORM_DRAWER_DESCRIPTION_CLASS,
  FORM_DRAWER_FOOTER_CLASS,
  FORM_DRAWER_HEADER_CLASS,
  FORM_DRAWER_TITLE_CLASS,
  formDrawerSheetClass,
  type FormDrawerShellWidth,
} from "@/components/forms/form-drawer-shell";
import { cn } from "@/lib/utils";

export interface FormSheetProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  form?: UseFormReturn<T>;
  schema?: z.ZodTypeAny;
  onSubmit?: (values: T) => void;
  isPending?: boolean;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  secondarySubmitLabel?: string;
  onSecondarySubmit?: (values: T) => void;
  showSecondarySubmit?: boolean;
  pendingAction?: "primary" | "secondary" | null;
  /** @default false — sheets include an X close control; omit redundant footer Cancel */
  showCancelButton?: boolean;
  cancelLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  isDeletePending?: boolean;
  hideFooter?: boolean;
  footer?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Width tier from the shared drawer map. Default medium (600). */
  width?: FormDrawerShellWidth;
}

export function FormSheet<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  schema,
  onSubmit,
  isPending = false,
  submitLabel = "Save",
  submitIcon,
  secondarySubmitLabel = "Save as draft",
  onSecondarySubmit,
  showSecondarySubmit = false,
  pendingAction = null,
  showCancelButton = false,
  cancelLabel = "Cancel",
  onDelete,
  deleteLabel = "Delete",
  isDeletePending = false,
  hideFooter = false,
  footer,
  headerClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  bodyClassName,
  children,
  className,
  contentClassName,
  width = "standard",
}: FormSheetProps<T>) {
  const resolvedFooterClassName = cn(
    FORM_DRAWER_FOOTER_CLASS,
    footerClassName,
  );

  const defaultFooter = (
    <SheetFooter className={resolvedFooterClassName}>
      <div className="flex w-full flex-wrap items-center justify-end gap-2.5">
        {onDelete ? (
          <ActionButton
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending || isDeletePending}
            className={cn(DRAWER_FOOTER_BUTTON_CLASS, "mr-auto")}
          >
            {isDeletePending ? "Deleting…" : deleteLabel}
          </ActionButton>
        ) : null}
        <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
          {showCancelButton ? (
            <ActionButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isDeletePending}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {cancelLabel}
            </ActionButton>
          ) : null}
          {showSecondarySubmit && onSecondarySubmit && form ? (
            <ActionButton
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSecondarySubmit)}
              disabled={isPending || isDeletePending}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {pendingAction === "secondary" ? "Saving…" : secondarySubmitLabel}
            </ActionButton>
          ) : null}
          <ActionButton
            type="submit"
            disabled={isPending || isDeletePending}
            className={DRAWER_FOOTER_BUTTON_CLASS}
          >
            {submitIcon ? (
              <span className="mr-1.5 inline-flex shrink-0">{submitIcon}</span>
            ) : null}
            {pendingAction === "primary"
              ? showSecondarySubmit
                ? "Sending…"
                : "Saving…"
              : submitLabel}
          </ActionButton>
        </div>
      </div>
    </SheetFooter>
  );

  const body = (
    <>
      <SheetBody className="min-h-0 flex-1 overflow-y-auto !p-0">
        <div
          className={cn(
            "space-y-4",
            !(bodyClassName || contentClassName) && FORM_DRAWER_CONTENT_CLASS,
            bodyClassName,
            contentClassName,
          )}
        >
          {children}
        </div>
      </SheetBody>
      {hideFooter ? null : footer ? (
        <SheetFooter className={resolvedFooterClassName}>{footer}</SheetFooter>
      ) : (
        defaultFooter
      )}
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("gap-0 p-0", formDrawerSheetClass(width), className)}
      >
        <SheetHeader className={cn(FORM_DRAWER_HEADER_CLASS, headerClassName)}>
          <SheetTitle className={cn(FORM_DRAWER_TITLE_CLASS, titleClassName)}>
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription
              className={cn(FORM_DRAWER_DESCRIPTION_CLASS, descriptionClassName)}
            >
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        {form && onSubmit ? (
          <Form {...form}>
            {schema ? (
              <FormSchemaProvider schema={schema}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
                  {body}
                </form>
              </FormSchemaProvider>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
                {body}
              </form>
            )}
          </Form>
        ) : (
          body
        )}
      </SheetContent>
    </Sheet>
  );
}
