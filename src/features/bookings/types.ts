/**
 * Domain types for Booking & Checkout Lifecycles
 */

export type BookingStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "checked_out"
  | "returned"
  | "cancelled";

export interface ReturnConditionReport {
  reportedAt: string;
  inspectorId: string;
  conditionStatus: "intact" | "minor_wear" | "damaged" | "missing_parts";
  notes?: string;
}

export interface BookingRequest {
  id: string;
  resourceId: string;
  requesterId: string;
  requesterName: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  checkoutTime?: string;
  returnTime?: string;
  returnCondition?: ReturnConditionReport;
  createdAt: string;
  updatedAt: string;
}
