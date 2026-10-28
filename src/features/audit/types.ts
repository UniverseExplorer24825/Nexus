/**
 * Domain types for Auditable Activity History
 */

export type AuditActionType =
  | "resource_created"
  | "resource_updated"
  | "booking_requested"
  | "booking_approved"
  | "booking_rejected"
  | "resource_checked_out"
  | "resource_returned"
  | "clearance_verified";

export interface AuditRecord {
  id: string;
  timestamp: string;
  action: AuditActionType;
  actorId: string;
  actorName: string;
  targetResourceId?: string;
  targetBookingId?: string;
  metadata?: Record<string, unknown>;
}
