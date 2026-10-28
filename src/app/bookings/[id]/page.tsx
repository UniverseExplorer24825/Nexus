import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getBookingById } from "@/features/bookings/services/booking-service";
import { BookingDetailView } from "@/features/bookings/components/booking-detail-view";
import { ContentContainer } from "@/components/ui/content-container";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

async function BookingDetailsContent({ params }: BookingPageProps) {
  const { id } = await params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/auth/sign-in?redirectTo=/bookings/${id}`);
  }

  const booking = await getBookingById(id, user.id);

  if (!booking) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-8 w-8 text-rose-500" />}
        title="Reservation not found or access restricted"
        description="This reservation does not exist or you do not have participant credentials to view condition records and lifecycle controls."
        action={
          <Link href="/bookings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Return to My Bookings
            </Button>
          </Link>
        }
      />
    );
  }

  return <BookingDetailView booking={booking} currentUserId={user.id} />;
}

export default function BookingDetailsPage({ params }: BookingPageProps) {
  return (
    <ContentContainer>
      <div className="mb-4">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Bookings</span>
        </Link>
      </div>

      <React.Suspense fallback={<LoadingState message="Loading reservation details..." />}>
        <BookingDetailsContent params={params} />
      </React.Suspense>
    </ContentContainer>
  );
}
