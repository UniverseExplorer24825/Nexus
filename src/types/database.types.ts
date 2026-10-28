/**
 * Database schema definitions for Supabase integration.
 * This file serves as the type contract and can be regenerated via Supabase CLI
 * (e.g. `supabase gen types typescript`).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          institution_id: string | null;
          role: "student" | "researcher" | "lab_manager" | "admin";
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          institution_id?: string | null;
          role?: "student" | "researcher" | "lab_manager" | "admin";
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          institution_id?: string | null;
          role?: "student" | "researcher" | "lab_manager" | "admin";
        };
      };
      resources: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          category: string;
          description: string | null;
          institution_id: string;
          owner_id: string;
          is_available: boolean;
          location: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          category: string;
          description?: string | null;
          institution_id: string;
          owner_id: string;
          is_available?: boolean;
          location?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          category?: string;
          description?: string | null;
          institution_id?: string;
          owner_id?: string;
          is_available?: boolean;
          location?: string | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          resource_id: string;
          requester_id: string;
          start_time: string;
          end_time: string;
          status: "pending" | "approved" | "rejected" | "checked_out" | "returned" | "cancelled";
          purpose: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          resource_id: string;
          requester_id: string;
          start_time: string;
          end_time: string;
          status?: "pending" | "approved" | "rejected" | "checked_out" | "returned" | "cancelled";
          purpose?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          resource_id?: string;
          requester_id?: string;
          start_time?: string;
          end_time?: string;
          status?: "pending" | "approved" | "rejected" | "checked_out" | "returned" | "cancelled";
          purpose?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          created_at: string;
          entity_type: string;
          entity_id: string;
          actor_id: string;
          action: string;
          details: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          entity_type: string;
          entity_id: string;
          actor_id: string;
          action: string;
          details?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          entity_type?: string;
          entity_id?: string;
          actor_id?: string;
          action?: string;
          details?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
