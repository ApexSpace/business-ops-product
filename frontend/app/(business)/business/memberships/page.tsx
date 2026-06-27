import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MembershipsWorkspace } from "@/features/memberships/components/memberships-workspace";

export default function MembershipsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Memberships"
        description="Manage client memberships and subscriptions."
      />
      <MembershipsWorkspace />
    </PageContainer>
  );
}
