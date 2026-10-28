import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, Filter, PlusCircle } from "lucide-react";

export default function DiscoverResourcesPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Discover Resources"
        description="Search, filter, and inspect institutional equipment, laboratories, and workspaces available for sharing."
        badge={<Badge variant="neutral">Directory Ready</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
            <Link href="/my-resources">
              <Button variant="teal" size="sm">
                <PlusCircle className="h-4 w-4" />
                <span>List Equipment</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<Compass className="h-6 w-6 text-teal-600" />}
          title="Catalog database awaiting records"
          description="The resource discovery directory is structured and ready to index apparatus across participating institutions. Live listings, specs, and availability calendars will be loaded once database integration is active."
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
