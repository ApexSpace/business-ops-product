import {
  PipelinesHostProvider,
  PLATFORM_PIPELINES_HOST,
} from "@/features/pipelines/pipelines-host-context";
import { PlatformLifecyclePipelinesPage } from "@/features/pipelines/pages/platform-lifecycle-pipelines-page";

export default function PlatformPipelinesPage() {
  return (
    <PipelinesHostProvider value={PLATFORM_PIPELINES_HOST}>
      <PlatformLifecyclePipelinesPage />
    </PipelinesHostProvider>
  );
}
