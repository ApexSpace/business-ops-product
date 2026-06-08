"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/text-field";
import {
  clonePlatformSnapshot,
  updatePlatformSnapshot,
} from "@/features/platform/api/snapshots.api";
import { snapshotOverviewSchema, type SnapshotOverviewValues } from "@/features/platform/schemas/snapshot-form";
import { queryKeys } from "@/lib/query/keys";
import type { SnapshotListItem } from "@/features/platform/types/snapshot";

interface CloneSnapshotDialogProps {
  snapshot: SnapshotListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneSnapshotDialog({
  snapshot,
  open,
  onOpenChange,
}: CloneSnapshotDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<SnapshotOverviewValues>({
    resolver: zodResolver(snapshotOverviewSchema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: SnapshotOverviewValues) => {
      if (!snapshot) throw new Error("No snapshot selected");
      const cloned = await clonePlatformSnapshot(snapshot.id);
      return updatePlatformSnapshot(cloned.id, {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      toast.success(`Created "${result.name}" from ${snapshot?.name}`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.snapshots.all(),
      });
      onOpenChange(false);
      form.reset({ name: "", description: "" });
      router.push(`/platform/snapshots/${result.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset({ name: "", description: "" });
        else if (snapshot) {
          form.reset({
            name: `${snapshot.name} (Copy)`,
            description: snapshot.description ?? "",
          });
        }
      }}
      title="Clone snapshot"
      description={
        snapshot
          ? `Create a draft copy of "${snapshot.name}". Choose a new name for the clone.`
          : undefined
      }
      form={form}
      onSubmit={(values) => mutation.mutate(values)}
      isPending={mutation.isPending}
      submitLabel="Clone & open editor"
      size="md"
    >
      <TextField
        control={form.control}
        name="name"
        label="New snapshot name"
        placeholder="Dental Practice (Copy)"
      />
    </FormDialog>
  );
}
