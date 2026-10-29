/**
 * Database schema definitions for Supabase integration.
 * Matches the schema generated in supabase/migrations/20261028000001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "member" | "resource_owner" | "institution_admin";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type ResourceStatus = "draft" | "published" | "archived";
export type ResourceType =
  | "equipment"
  | "laboratory"
  | "workspace"
  | "meeting_room"
  | "classroom"
  | "other";
export type BookingStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "checked_out"
  | "returned"
  | "completed"
  | "cancelled";
export type ConditionStage = "checkout" | "return";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "under_review" | "resolved" | "dismissed";
export type EligibilityCheckStatus = "pending" | "passed" | "failed";

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          location: string | null;
          domain: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          location?: string | null;
          domain?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          location?: string | null;
          domain?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          institution_id: string | null;
          role: UserRole;
          verification_status: VerificationStatus;
          is_suspended: boolean;
          suspension_reason: string | null;
          suspended_at: string | null;
          suspended_by: string | null;
          verification_notes: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          institution_id?: string | null;
          role?: UserRole;
          verification_status?: VerificationStatus;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          verification_notes?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          institution_id?: string | null;
          role?: UserRole;
          verification_status?: VerificationStatus;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          verification_notes?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          owner_id: string;
          institution_id: string | null;
          title: string;
          description: string | null;
          category: string;
          resource_type: ResourceType;
          location: string | null;
          images: Json;
          eligibility_requirements: string | null;
          usage_rules: string | null;
          deposit_amount: number;
          currency: string;
          status: ResourceStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          institution_id?: string | null;
          title: string;
          description?: string | null;
          category: string;
          resource_type?: ResourceType;
          location?: string | null;
          images?: Json;
          eligibility_requirements?: string | null;
          usage_rules?: string | null;
          deposit_amount?: number;
          currency?: string;
          status?: ResourceStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          institution_id?: string | null;
          title?: string;
          description?: string | null;
          category?: string;
          resource_type?: ResourceType;
          location?: string | null;
          images?: Json;
          eligibility_requirements?: string | null;
          usage_rules?: string | null;
          deposit_amount?: number;
          currency?: string;
          status?: ResourceStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      resource_availability: {
        Row: {
          id: string;
          resource_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          resource_id: string;
          borrower_id: string;
          start_time: string;
          end_time: string;
          status: BookingStatus;
          request_notes: string | null;
          decision_by: string | null;
          decision_at: string | null;
          decision_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          borrower_id: string;
          start_time: string;
          end_time: string;
          status?: BookingStatus;
          request_notes?: string | null;
          decision_by?: string | null;
          decision_at?: string | null;
          decision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          borrower_id?: string;
          start_time?: string;
          end_time?: string;
          status?: BookingStatus;
          request_notes?: string | null;
          decision_by?: string | null;
          decision_at?: string | null;
          decision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      eligibility_checks: {
        Row: {
          id: string;
          booking_id: string;
          requirement: string;
          status: EligibilityCheckStatus;
          reviewer_id: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          requirement: string;
          status?: EligibilityCheckStatus;
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          requirement?: string;
          status?: EligibilityCheckStatus;
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      condition_reports: {
        Row: {
          id: string;
          booking_id: string;
          resource_id: string | null;
          stage: ConditionStage;
          notes: string;
          photos: Json;
          reporter_id: string;
          issues_flagged: boolean;
          issue_types: string[];
          safety_acknowledged: boolean;
          is_late: boolean;
          late_minutes: number;
          review_status?: string | null;
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reported_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          resource_id?: string | null;
          stage: ConditionStage;
          notes: string;
          photos?: Json;
          reporter_id: string;
          issues_flagged?: boolean;
          issue_types?: string[];
          safety_acknowledged?: boolean;
          is_late?: boolean;
          late_minutes?: number;
          review_status?: string | null;
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reported_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          resource_id?: string | null;
          stage?: ConditionStage;
          notes?: string;
          photos?: Json;
          reporter_id?: string;
          issues_flagged?: boolean;
          issue_types?: string[];
          safety_acknowledged?: boolean;
          is_late?: boolean;
          late_minutes?: number;
          review_status?: string | null;
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reported_at?: string;
          created_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          booking_id: string;
          resource_id: string | null;
          reporter_id: string;
          incident_type: string;
          description: string;
          severity: IncidentSeverity;
          status: IncidentStatus;
          photos: Json;
          reviewer_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          resource_id?: string | null;
          reporter_id: string;
          incident_type: string;
          description: string;
          severity?: IncidentSeverity;
          status?: IncidentStatus;
          photos?: Json;
          reviewer_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          resource_id?: string | null;
          reporter_id?: string;
          incident_type?: string;
          description?: string;
          severity?: IncidentSeverity;
          status?: IncidentStatus;
          photos?: Json;
          reviewer_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          category: string;
          booking_id: string | null;
          resource_id: string | null;
          incident_id: string | null;
          link: string | null;
          dedup_key: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          category?: string;
          booking_id?: string | null;
          resource_id?: string | null;
          incident_id?: string | null;
          link?: string | null;
          dedup_key?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          category?: string;
          booking_id?: string | null;
          resource_id?: string | null;
          incident_id?: string | null;
          link?: string | null;
          dedup_key?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          resource_id: string | null;
          booking_id: string | null;
          action_type: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          resource_id?: string | null;
          booking_id?: string | null;
          action_type: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          resource_id?: string | null;
          booking_id?: string | null;
          action_type?: string;
          details?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { check_user_id: string };
        Returns: boolean;
      };
      is_resource_owner: {
        Args: { check_resource_id: string; check_user_id: string };
        Returns: boolean;
      };
      is_booking_participant: {
        Args: { check_booking_id: string; check_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      verification_status: VerificationStatus;
      resource_status: ResourceStatus;
      booking_status: BookingStatus;
      condition_stage: ConditionStage;
      incident_severity: IncidentSeverity;
      incident_status: IncidentStatus;
      eligibility_check_status: EligibilityCheckStatus;
    };
  };
}
