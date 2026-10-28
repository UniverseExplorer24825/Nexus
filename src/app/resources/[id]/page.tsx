import * as React from "react";
import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ArrowLeft, Box } from "lucide-react";

async function ResourceDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Resource Details: #${id}`}
        description="Detailed specifications, safety prerequisites, custodian contact, and booking reservation calendar."
        badge={<Badge variant="neutral">Detail View</Badge>}
        actions={
          <Link href="/resources">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Directory</span>
            </Button>
          </Link>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<Box className="h-6 w-6 text-slate-500" />}
          title={`Resource record "${id}" not loaded`}
          description="Resource metadata, operating guides, eligibility requirements, and real-time reservation slots will populate from Supabase in the subsequent feature phase."
          action={
            <Link href="/resources">
              <Button variant="teal" size="sm">
                Explore Available Directory
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}

export default function ResourceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ContentContainer>
      <React.Suspense fallback={<LoadingState message="Resolving resource specifications..." />}>
        <ResourceDetailsContent params={params} />
      </React.Suspense>
    </ContentContainer>
  );
}
