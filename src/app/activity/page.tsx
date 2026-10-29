import * as React from "react";
import { getActivityLogs } from "@/features/admin/services/admin-service";
import { ActivityDashboardView } from "@/features/audit/components/activity-dashboard-view";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ShieldCheck } from "lucide-react";

async function ActivityLogsContent() {
  const logs = await getActivityLogs({ limit: 100 });

  return <ActivityDashboardView initialLogs={logs} />;
}

export default function ActivityHistoryPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Activity & Audit History"
        description="Immutable audit trail of equipment requests, custodian authorizations, checkouts, returns, incident reports, and institutional governance."
        badge={<Badge variant="teal">Audited Ledger</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Cryptographic Log Verification</span>
          </div>
        }
      />

      <div className="mt-8">
        <React.Suspense fallback={<LoadingState message="Querying institutional audit ledger..." />}>
          <ActivityLogsContent />
        </React.Suspense>
      </div>
    </ContentContainer>
  );
}
