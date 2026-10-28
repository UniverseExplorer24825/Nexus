"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import type { BookingDecision, EligibilityCheckStatus } from "./types";

export interface BookingActionResult {
  success?: boolean;
  error?: string;
  bookingId?: string;
}

/**
 * Creates a new booking request for an apparatus or space.
 * Server validates time range, identity, non-past window, duration limit, and publication status.
 */
export async function createBookingRequestAction(
  prevState: unknown,
  formData: FormData
): Promise<BookingActionResult> {
  const { user } = await requireUser("/auth/sign-in");

  const resourceId = formData.get("resource_id")?.toString();
  const startTimeRaw = formData.get("start_time")?.toString();
  const endTimeRaw = formData.get("end_time")?.toString();
  const requestNotes = formData.get("request_notes")?.toString()?.trim() || "";

  if (!resourceId) {
    return { error: "Missing resource identifier." };
  }

  if (!startTimeRaw || !endTimeRaw) {
    return { error: "Please select both a start date/time and end date/time." };
  }

  const startDate = new Date(startTimeRaw);
  const endDate = new Date(endTimeRaw);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid date or time format provided." };
  }

  // Start must precede end
  if (startDate >= endDate) {
    return { error: "Requested start time must be strictly earlier than end time." };
  }

  // Minimum duration: 15 minutes
  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 15 * 60 * 1000) {
    return { error: "Reservation must be for at least 15 minutes." };
  }

  // Maximum duration: 30 consecutive days
  if (durationMs > 30 * 24 * 60 * 60 * 1000) {
    return { error: "Reservation cannot exceed 30 consecutive days." };
  }

  // Non-past check: Allow 5 minutes clock-skew leeway
  const nowWithSkew = new Date(Date.now() - 5 * 60 * 1000);
  if (startDate < nowWithSkew) {
    return { error: "Reservation start time cannot be in the past." };
  }

  const supabase = await createClient();

  // Validate resource existence, publication status, and ownership boundary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data: resource, error: resError } = await (supabase.from("resources") as any)
    .select("id, owner_id, status, title")
    .eq("id", resourceId)
    .single();

  if (resError || !resource) {
    return { error: "Target apparatus not found." };
  }

  if (resource.status !== "published") {
    return { error: "This apparatus is not currently published or accepting bookings." };
  }

  // Prohibit self-booking
  if (resource.owner_id === user.id) {
    return { error: "Resource custodians cannot submit booking reservations for apparatus they manage." };
  }

  // Insert booking request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST insert query
  const { data: booking, error: insertError } = await (supabase.from("bookings") as any)
    .insert({
      resource_id: resourceId,
      borrower_id: user.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: "requested",
      request_notes: requestNotes || null,
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    console.error("[BookingAction] Insert error:", insertError?.message);
    return { error: `Failed to submit reservation request: ${insertError?.message || "Unknown error"}` };
  }

  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/bookings");
  revalidatePath("/approvals");
  revalidatePath("/");

  redirect("/bookings");
}

/**
 * Custodian decision action: Approve, Reject, or Waitlist a booking request.
 */
export async function decideBookingAction(
  bookingId: string,
  decision: BookingDecision,
  decisionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireUser();
  const supabase = await createClient();

  // Fetch booking and verify caller is custodian
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST join query
  const { data: booking, error: fetchError } = await (supabase.from("bookings") as any)
    .select(
      `
      id,
      resource_id,
      borrower_id,
      status,
      start_time,
      end_time,
      resource:resources (
        owner_id,
        title
      )
    `
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking record not found." };
  }

  const isOwner = booking.resource?.owner_id === user.id;
  if (!isOwner) {
    return { success: false, error: "Unauthorized: Only the resource custodian can authorize reservations." };
  }

  if (booking.borrower_id === user.id) {
    return { success: false, error: "You cannot approve your own booking." };
  }

  if (booking.status !== "requested" && booking.status !== "waitlisted") {
    return {
      success: false,
      error: `This booking is in "${booking.status}" status and can no longer be decided.`,
    };
  }

  // If rejecting, require explanation
  if (decision === "rejected" && (!decisionNotes || decisionNotes.trim().length === 0)) {
    return { success: false, error: "Please provide a reason when rejecting a booking request." };
  }

  // If approving, check eligibility prerequisites
  if (decision === "approved") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST count query
    const { count: pendingChecks } = await (supabase.from("eligibility_checks") as any)
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .in("status", ["pending", "failed"]);

    if (pendingChecks && pendingChecks > 0) {
      return {
        success: false,
        error: `Cannot approve: There are ${pendingChecks} mandatory eligibility requirement(s) pending verification or failed. Please review and verify prerequisites first.`,
      };
    }
  }

  // Update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST update query
  const { error: updateError } = await (supabase.from("bookings") as any)
    .update({
      status: decision,
      decision_by: user.id,
      decision_at: new Date().toISOString(),
      decision_notes: decisionNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    // PostgreSQL exclusion constraint violation (code 23P01)
    if (updateError.code === "23P01" || updateError.message.includes("prevent_overlapping_active_bookings")) {
      return {
        success: false,
        error: "Scheduling conflict: This apparatus already has an active approved reservation during this time window. You can place this request on the waiting list instead.",
      };
    }

    return { success: false, error: updateError.message };
  }

  revalidatePath("/approvals");
  revalidatePath("/bookings");
  revalidatePath(`/resources/${booking.resource_id}`);

  return { success: true };
}

/**
 * Cancels a booking request. Can be invoked by borrower or custodian.
 */
export async function cancelBookingAction(
  bookingId: string,
  cancelReason?: string
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireUser();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data: booking, error: fetchError } = await (supabase.from("bookings") as any)
    .select(
      `
      id,
      resource_id,
      borrower_id,
      status,
      resource:resources (owner_id)
    `
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking not found." };
  }

  const isBorrower = booking.borrower_id === user.id;
  const isOwner = booking.resource?.owner_id === user.id;

  if (!isBorrower && !isOwner) {
    return { success: false, error: "Unauthorized to cancel this booking." };
  }

  if (["completed", "returned", "rejected", "cancelled"].includes(booking.status)) {
    return { success: false, error: `Cannot cancel booking in status "${booking.status}".` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST update query
  const { error: updateError } = await (supabase.from("bookings") as any)
    .update({
      status: "cancelled",
      decision_notes: cancelReason || (isBorrower ? "Cancelled by borrower" : "Cancelled by custodian"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/bookings");
  revalidatePath("/approvals");
  revalidatePath(`/resources/${booking.resource_id}`);

  return { success: true };
}

/**
 * Custodian reviews and updates a specific eligibility check for a booking.
 */
export async function resolveEligibilityCheckAction(
  checkId: string,
  status: EligibilityCheckStatus,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireUser();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST update query
  const { error } = await (supabase.from("eligibility_checks") as any)
    .update({
      status,
      reviewer_id: user.id,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath("/bookings");

  return { success: true };
}
