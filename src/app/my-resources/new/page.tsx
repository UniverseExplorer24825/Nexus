import * as React from "react";
import { requireUser } from "@/lib/supabase/auth";
import { getInstitutions } from "@/features/resources/services/resource-service";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";

async function NewResourceContent() {
  await requireUser("/auth/sign-in?redirectTo=/my-resources/new");
  const institutions = await getInstitutions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Shared Resource"
        description="Publish scientific equipment, fabrication tools, or testing rooms to the institutional network."
        badge={<Badge variant="teal">Custodian Registration</Badge>}
      />

      <div className="mt-8 max-w-4xl">
        <ResourceForm institutions={institutions} />
      </div>
    </div>
  );
}

export default function NewResourcePage() {
  return (
    <ContentContainer size="default">
      <React.Suspense fallback={<LoadingState message="Initializing resource registration..." />}>
        <NewResourceContent />
      </React.Suspense>
    </ContentContainer>
  );
}
