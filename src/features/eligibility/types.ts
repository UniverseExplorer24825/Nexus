/**
 * Domain types for User & Institutional Eligibility Verification
 */

export type ClearanceStatus = "verified" | "pending_review" | "expired" | "not_eligible";

export interface UserClearance {
  userId: string;
  institutionId: string;
  department: string;
  status: ClearanceStatus;
  completedCertifications: string[];
  expiresAt?: string;
}
