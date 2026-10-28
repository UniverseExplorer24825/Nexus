import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ShieldCheck } from "lucide-react";

export default function ActivityHistoryPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Activity & Audit History"
        description="Immutable audit trail of equipment requests, custodian authorizations, checkouts, returns, and incident reports."
        badge={<Badge variant="teal">Audited Ledger</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Cryptographic Log Verification</span>
          </div>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<History className="h-6 w-6 text-slate-500" />}
          title="No logged audit events"
          description="The institutional activity log will chronicle each custody handover, inspection sign-off, and return condition record once the Supabase audit schema is connected."
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
