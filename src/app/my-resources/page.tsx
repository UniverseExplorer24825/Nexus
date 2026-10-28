import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Boxes, PlusCircle } from "lucide-react";

export default function MyResourcesPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="My Resources"
        description="Equipment, instruments, and workspaces listed by your lab or department for cross-institutional sharing."
        badge={<Badge variant="neutral">Custodian Portal</Badge>}
        actions={
          <Button variant="teal" size="sm" disabled>
            <PlusCircle className="h-4 w-4" />
            <span>Add Equipment</span>
          </Button>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<Boxes className="h-6 w-6 text-slate-500" />}
          title="No resources registered yet"
          description="Your laboratory or department has not published any equipment or spaces to the Nexus network. Resource listing and management workflows will be available in the upcoming milestone."
          action={
            <Link href="/">
              <Button variant="outline" size="sm">
                Return to Overview
              </Button>
            </Link>
          }
        />
      </div>
    </ContentContainer>
  );
}
