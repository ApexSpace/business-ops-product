"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateLeadFormFields } from "@/features/leads/components/create-lead-form-fields";
import {
  useCreateLeadDialog,
  type UseCreateLeadDialogOptions,
} from "@/features/leads/hooks/use-create-lead-dialog";

interface CreateLeadDialogProps extends UseCreateLeadDialogOptions {}

export function CreateLeadDialog(props: CreateLeadDialogProps) {
  const { open, onOpenChange } = props;
  const dialog = useCreateLeadDialog(props);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {dialog.pipelinesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : dialog.pipelinesError ? (
            <p className="text-sm text-destructive">
              Could not load form data. Close and try again.
            </p>
          ) : dialog.pipelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a pipeline first, then you can add leads.
            </p>
          ) : (
            <Form {...dialog.form}>
              <FormSchemaProvider schema={dialog.schema}>
                <form
                  id="create-lead-form"
                  onSubmit={dialog.form.handleSubmit((v) =>
                    dialog.mutation.mutate(v),
                  )}
                  className="space-y-4"
                >
                  <CreateLeadFormFields
                    form={dialog.form}
                    lockPipeline={dialog.lockPipeline}
                    lockedContact={dialog.lockedContact}
                    pipelineItems={dialog.pipelineItems}
                    stageItems={dialog.stageItems}
                    serviceItems={dialog.serviceItems}
                    assigneeItems={dialog.assigneeItems}
                    canAssign={dialog.canAssign}
                    pipelines={dialog.pipelines}
                  />
                </form>
              </FormSchemaProvider>
            </Form>
          )}
        </DialogBody>
        {!dialog.pipelinesLoading &&
        !dialog.pipelinesError &&
        dialog.pipelineItems.length > 0 ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-lead-form"
              disabled={dialog.mutation.isPending}
            >
              {dialog.mutation.isPending ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
