import type { UserRole, VerificationStatus } from "@/types/database.types";
import type { DbProfile, DbInstitution, DbResource } from "@/features/resources/types";
import type { BookingWithRelations } from "@/features/bookings/types";

export type { UserRole, VerificationStatus };

export interface MemberWithDetails extends DbProfile {
  department?: string | null;
  institution?: DbInstitution | null;
  verifier?: Pick<DbProfile, "id" | "full_name"> | null;
  active_loans_count?: number;
  total_bookings_count?: number;
}

export interface InstitutionMetrics {
  totalMembers: number;
  pendingVerifications: number;
  suspendedMembers: number;
  totalResources: number;
  activeLoans: number;
  overdueLoans: number;
  unresolvedIncidents: number;
  pendingApprovals: number;
}

export interface InstitutionLoanSummary extends BookingWithRelations {
  is_overdue?: boolean;
  overdue_duration_text?: string | null;
}

export interface ActivityLogWithDetails {
  id: string;
  actor_id: string | null;
  resource_id: string | null;
  booking_id: string | null;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role"> | null;
  resource?: Pick<DbResource, "id" | "title" | "category"> | null;
  booking?: {
    id: string;
    status: string;
    start_time: string;
    end_time: string;
  } | null;
}
