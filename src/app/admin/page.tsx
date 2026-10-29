import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getInstitutionMembers,
  getInstitutionMetrics,
  getInstitutionLoans,
  getInstitutionIncidents,
  getActivityLogs,
} from "@/features/admin/services/admin-service";
import { AdminDashboardView } from "@/features/admin/components/admin-dashboard-view";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react";

async function AdminContent() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?redirectTo=/admin");
  }

  const supabase = await createClient();

  // Fetch caller profile and institution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("*, institution:institutions (*)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "institution_admin") {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-8 w-8 text-amber-500" />}
        title="Institutional Administrator Access Required"
        description="This console is restricted to designated facility managers and institutional administrators. Contact your department administrator to request governance access."
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Return to Overview</span>
            </Button>
          </Link>
        }
      />
    );
  }

  const institutionId = profile.institution_id || "default-inst";
  const institutionName = profile.institution?.name || "TechCircuit Consortium Institute";

  // Fetch all live data in parallel
  const [metrics, members, loans, incidents, logs] = await Promise.all([
    getInstitutionMetrics(institutionId),
    getInstitutionMembers(institutionId),
    getInstitutionLoans(institutionId),
    getInstitutionIncidents(institutionId),
    getActivityLogs({ institutionId, limit: 30 }),
  ]);

  return (
    <AdminDashboardView
      currentUserId={user.id}
      institutionName={institutionName}
      metrics={metrics}
      initialMembers={members}
      initialLoans={loans}
      initialIncidents={incidents}
      initialLogs={logs}
    />
  );
}

export default function AdminPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Institutional Administration"
        description="Oversee member verifications, custodian roles, active apparatus loans, and compliance across your institution."
        badge={<Badge variant="teal">Governance & Audit</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Institutional Admin Enforced</span>
          </div>
        }
      />

      <div className="mt-8">
        <React.Suspense fallback={<LoadingState message="Loading institutional governance console..." />}>
          <AdminContent />
        </React.Suspense>
      </div>
    </ContentContainer>
  );
}
