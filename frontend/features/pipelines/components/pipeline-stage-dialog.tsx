"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { pipelineStageTypeOptions } from "@/features/pipelines/utils/select-options";
import type { PipelineStage } from "@/features/pipelines/types";
import { createPipelineStage } from "@/features/pipelines/api/pipelines.api";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["OPEN", "WON", "LOST"]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface PipelineStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onSuccess: () => void;
}

export function PipelineStageDialog({
  open,
  onOpenChange,
  pipelineId,
  onSuccess,
}: PipelineStageDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "OPEN" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createPipelineStage(pipelineId, {
        name: values.name,
        type: values.type,
      }),
    onSuccess: () => {
      toast.success("Stage added");
      form.reset({ name: "", type: "OPEN" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stage</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <FormSchemaProvider schema={schema}>
            <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Qualified" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      items={pipelineStageTypeOptions}
                      value={field.value ?? "OPEN"}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding…" : "Add stage"}
              </Button>
            </div>
            </form>
          </FormSchemaProvider>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
