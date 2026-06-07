"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormSchemaProvider } from "@/components/ui/form";

export interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  form: UseFormReturn<T>;
  /** Zod schema used to mark required fields with an asterisk on labels. */
  schema?: z.ZodTypeAny;
  onSubmit: (values: T) => void;
  isPending?: boolean;
  submitLabel?: string;
  /** Optional second submit action (e.g. save as draft beside send). */
  secondarySubmitLabel?: string;
  onSecondarySubmit?: (values: T) => void;
  showSecondarySubmit?: boolean;
  pendingAction?: "primary" | "secondary" | null;
  cancelLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  isDeletePending?: boolean;
  /** Secondary action shown before disconnect/close (e.g. Reconnect). */
  onReconnect?: () => void;
  reconnectLabel?: string;
  /** Hides Cancel; use with `footerVariant="actions"` for manage-only dialogs. */
  hideCancel?: boolean;
  /** Single-row footer: reconnect, disconnect, primary action (no cancel). */
  footerVariant?: "default" | "actions";
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  schema,
  onSubmit,
  isPending = false,
  submitLabel = "Save",
  secondarySubmitLabel = "Save as draft",
  onSecondarySubmit,
  showSecondarySubmit = false,
  pendingAction = null,
  cancelLabel = "Cancel",
  onDelete,
  deleteLabel = "Delete",
  isDeletePending = false,
  onReconnect,
  reconnectLabel = "Reconnect",
  hideCancel = false,
  footerVariant = "default",
  children,
  className,
  size = "md",
}: FormDialogProps<T>) {
  const useActionsFooter = footerVariant === "actions" || hideCancel;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </DialogHeader>
        <Form {...form}>
          {(() => {
            const body = (
              <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
                <DialogBody className="space-y-4">{children}</DialogBody>
                <DialogFooter
                  className={
                    useActionsFooter
                      ? "flex flex-row flex-wrap items-center justify-end gap-2"
                      : "gap-2 sm:justify-between"
                  }
                >
                  {useActionsFooter ? (
                    <>
                      {onReconnect ? (
                        <ActionButton
                          type="button"
                          variant="outline"
                          onClick={onReconnect}
                          disabled={isPending || isDeletePending}
                        >
                          {reconnectLabel}
                        </ActionButton>
                      ) : null}
                      {onDelete ? (
                        <ActionButton
                          type="button"
                          variant="destructive"
                          onClick={onDelete}
                          disabled={isPending || isDeletePending}
                        >
                          {isDeletePending ? "Deleting…" : deleteLabel}
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        type="submit"
                        disabled={isPending || isDeletePending}
                      >
                        {isPending ? "Saving…" : submitLabel}
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      {onDelete ? (
                        <ActionButton
                          type="button"
                          variant="destructive"
                          onClick={onDelete}
                          disabled={isPending || isDeletePending}
                          className="sm:mr-auto"
                        >
                          {isDeletePending ? "Deleting…" : deleteLabel}
                        </ActionButton>
                      ) : (
                        <span className="hidden sm:block sm:flex-1" />
                      )}
                      <div className="flex w-full flex-col-reverse items-end gap-2 sm:w-auto sm:flex-row sm:items-center">
                        {!hideCancel ? (
                          <ActionButton
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending || isDeletePending}
                          >
                            {cancelLabel}
                          </ActionButton>
                        ) : null}
                        {showSecondarySubmit && onSecondarySubmit ? (
                          <ActionButton
                            type="button"
                            variant="outline"
                            onClick={form.handleSubmit(onSecondarySubmit)}
                            disabled={isPending || isDeletePending}
                          >
                            {pendingAction === "secondary"
                              ? "Saving…"
                              : secondarySubmitLabel}
                          </ActionButton>
                        ) : null}
                        <ActionButton
                          type="submit"
                          disabled={isPending || isDeletePending}
                        >
                          {pendingAction === "primary"
                            ? showSecondarySubmit
                              ? "Sending…"
                              : "Saving…"
                            : submitLabel}
                        </ActionButton>
                      </div>
                    </>
                  )}
                </DialogFooter>
              </form>
            );
            return schema ? (
              <FormSchemaProvider schema={schema}>{body}</FormSchemaProvider>
            ) : (
              body
            );
          })()}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
