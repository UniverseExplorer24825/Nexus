import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Compass } from "lucide-react";

export default function MyBookingsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="My Bookings"
        description="Monitor status of your equipment reservations, upcoming custody handovers, and return deadlines."
        badge={<Badge variant="neutral">Reservations</Badge>}
        actions={
          <Link href="/resources">
            <Button variant="teal" size="sm">
              <Compass className="h-4 w-4" />
              <span>Book Equipment</span>
            </Button>
          </Link>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6 text-teal-600" />}
          title="No active bookings found"
          description="You do not have any pending or active equipment reservations. When you submit a booking request for lab instruments or space, it will appear here along with custodian approval status."
          action={
            <Link href="/resources">
              <Button variant="outline" size="sm">
                Browse Resources to Book
              </Button>
            </Link>
          }
        />
      </div>
    </ContentContainer>
  );
}
