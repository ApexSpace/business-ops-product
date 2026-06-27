import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PackagesWorkspace } from "@/features/packages/components/packages-workspace";

export default function PackagesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Packages"
        description="Manage prepaid service packages assigned to clients."
      />
      <PackagesWorkspace />
    </PageContainer>
  );
}
