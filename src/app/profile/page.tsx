import * as React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ProfileView } from "@/features/profile/components/profile-view";
import { Building2, LogIn } from "lucide-react";

async function ProfileContent() {
  const { user } = await getCurrentUser();

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6 text-teal-600" />}
        title="Sign in to view your institutional profile"
        description="Connect with your academic credentials to manage your verified laboratory clearances, research affiliation, and notifications."
        action={
          <Link href="/auth/sign-in?redirectTo=/profile">
            <Button variant="teal" size="sm">
              <span>Sign In</span>
            </Button>
          </Link>
        }
      />
    );
  }

  const supabase = await createClient();

  // Fetch user profile with institution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("*, institution:institutions (*)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <EmptyState
        title="Profile Record Not Found"
        description="Could not locate your user profile record in the database."
      />
    );
  }

  // Fetch user stats
  const [{ count: activeBookingsCount }, { count: hostedResourcesCount }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .eq("borrower_id", user.id)
      .in("status", ["requested", "approved", "checked_out"]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("resources") as any)
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id),
  ]);

  return (
    <ProfileView
      user={{ id: user.id, email: user.email }}
      profile={profile}
      stats={{
        activeBookingsCount: activeBookingsCount || 0,
        hostedResourcesCount: hostedResourcesCount || 0,
      }}
    />
  );
}

export default function ProfileSettingsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Profile & Institutional Settings"
        description="Manage your institutional identity, verified clearances, safety standing, and resource stewardship."
        badge={<Badge variant="teal">Institutional Identity</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-teal-600" />
            <span>TechCircuit Consortium Network</span>
          </div>
        }
      />

      <div className="mt-8">
        <React.Suspense fallback={<LoadingState message="Loading researcher profile..." />}>
          <ProfileContent />
        </React.Suspense>
      </div>
    </ContentContainer>
  );
}
