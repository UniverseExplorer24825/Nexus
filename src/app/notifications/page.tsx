import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getUserNotifications } from "@/features/bookings/services/booking-service";
import { NotificationsView } from "@/features/notifications/components/notifications-view";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { Bell } from "lucide-react";

async function NotificationsContent() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/notifications");
  }

  const notifications = await getUserNotifications(user.id);

  return <NotificationsView notifications={notifications} currentUserId={user.id} />;
}

export default function NotificationsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Notifications & Alerts"
        description="Persistent inbox of reservation clearances, handover confirmations, condition reviews, and institutional announcements."
        badge={<Badge variant="teal">Alerts Inbox</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Bell className="h-4 w-4 text-teal-600" />
            <span>Real-time Event Stream</span>
          </div>
        }
      />

      <div className="mt-8">
        <React.Suspense fallback={<LoadingState message="Loading notifications..." />}>
          <NotificationsContent />
        </React.Suspense>
      </div>
    </ContentContainer>
  );
}
