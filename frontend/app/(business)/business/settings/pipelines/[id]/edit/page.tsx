import { use } from "react";
import { PipelineEditSettings } from "@/features/pipelines/components/pipeline-edit-settings";

export default function PipelineEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PipelineEditSettings pipelineId={id} />;
}
