import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Approval Requests"
        description="Review borrower eligibility, evaluate research project purposes, and authorize custody transfers."
        badge={<Badge variant="neutral">Review Queue</Badge>}
      />

      <div className="mt-8">
        <EmptyState
          icon={<CheckSquare className="h-6 w-6 text-teal-600" />}
          title="Approval queue is clear"
          description="There are currently no outstanding reservation or custody requests awaiting your authorization. Incoming requests from researchers and students will appear here with verification credentials."
          action={
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to Overview
              </Button>
            </Link>
          }
        />
      </div>
    </ContentContainer>
  );
}
