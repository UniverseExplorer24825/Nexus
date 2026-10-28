import Link from "next/link";
import { ContentContainer } from "@/components/ui/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCog, Building2 } from "lucide-react";

export default function ProfileSettingsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Profile & Institutional Settings"
        description="Manage your institutional identity, verified clearances, safety certifications, and contact preferences."
        badge={<Badge variant="neutral">Account Settings</Badge>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-teal-600" />
            <span>TechCircuit Consortium Sandbox</span>
          </div>
        }
      />

      <div className="mt-8">
        <EmptyState
          icon={<UserCog className="h-6 w-6 text-slate-500" />}
          title="Institutional profile awaiting authentication"
          description="Institutional profile configuration, single sign-on (SSO), and verifiable research badges will be connected during the Supabase Auth integration task."
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
