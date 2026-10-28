import type {
  Database,
  BookingStatus as DbBookingStatus,
  EligibilityCheckStatus,
  ConditionStage,
  IncidentSeverity,
  IncidentStatus,
} from "@/types/database.types";
import type { DbResource, DbInstitution, DbProfile } from "@/features/resources/types";

export type DbBooking = Database["public"]["Tables"]["bookings"]["Row"];
export type DbBookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type DbBookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type DbEligibilityCheck = Database["public"]["Tables"]["eligibility_checks"]["Row"];
export type DbConditionReport = Database["public"]["Tables"]["condition_reports"]["Row"];
export type DbIncident = Database["public"]["Tables"]["incidents"]["Row"];
export type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

export type {
  DbBookingStatus as BookingStatus,
  EligibilityCheckStatus,
  ConditionStage,
  IncidentSeverity,
  IncidentStatus,
};

export interface BookingWithRelations extends DbBooking {
  resource: DbResource & {
    institution?: DbInstitution | null;
    owner?: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role" | "verification_status"> | null;
  };
  borrower: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role" | "verification_status">;
  decision_reviewer?: Pick<DbProfile, "id" | "full_name"> | null;
  eligibility_checks?: DbEligibilityCheck[];
  condition_reports?: DbConditionReport[];
  incidents?: DbIncident[];
  waitlist_position?: number | null;
  is_overdue?: boolean;
  overdue_duration_text?: string | null;
}

export interface BookingRequestInput {
  resource_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  request_notes?: string;
}

export type BookingDecision = "approved" | "rejected" | "waitlisted";

export interface CheckoutInput {
  booking_id: string;
  condition_notes: string;
  safety_acknowledged: boolean;
  photo_urls?: string[];
}

export interface ReturnInput {
  booking_id: string;
  condition_notes: string;
  issues_flagged: boolean;
  issue_types?: string[];
  photo_urls?: string[];
}

export interface ReturnInspectionInput {
  booking_id: string;
  review_notes?: string;
  flag_incident?: boolean;
  incident_type?: string;
  incident_severity?: IncidentSeverity;
  incident_description?: string;
}
