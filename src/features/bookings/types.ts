import type {
  Database,
  BookingStatus as DbBookingStatus,
  EligibilityCheckStatus,
} from "@/types/database.types";
import type { DbResource, DbInstitution, DbProfile } from "@/features/resources/types";

export type DbBooking = Database["public"]["Tables"]["bookings"]["Row"];
export type DbBookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type DbBookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type DbEligibilityCheck = Database["public"]["Tables"]["eligibility_checks"]["Row"];

export type { DbBookingStatus as BookingStatus, EligibilityCheckStatus };

export interface BookingWithRelations extends DbBooking {
  resource: DbResource & {
    institution?: DbInstitution | null;
    owner?: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role" | "verification_status"> | null;
  };
  borrower: Pick<DbProfile, "id" | "full_name" | "avatar_url" | "role" | "verification_status">;
  decision_reviewer?: Pick<DbProfile, "id" | "full_name"> | null;
  eligibility_checks?: DbEligibilityCheck[];
  waitlist_position?: number | null;
}

export interface BookingRequestInput {
  resource_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  request_notes?: string;
}

export type BookingDecision = "approved" | "rejected" | "waitlisted";
