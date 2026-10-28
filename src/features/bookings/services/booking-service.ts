import { createClient } from "@/lib/supabase/server";
import type { BookingWithRelations, DbBooking } from "../types";

/**
 * Retrieves all bookings requested or held by a specific borrower.
 */
export async function getMyBookings(
  userId: string,
  statusFilter?: string
): Promise<BookingWithRelations[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST complex join inference workaround
  let query = (supabase.from("bookings") as any)
    .select(
      `
      *,
      resource:resources (
        *,
        institution:institutions (*),
        owner:profiles (
          id,
          full_name,
          avatar_url,
          role,
          verification_status
        )
      ),
      borrower:profiles!borrower_id (
        id,
        full_name,
        avatar_url,
        role,
        verification_status
      ),
      decision_reviewer:profiles!decision_by (
        id,
        full_name
      ),
      eligibility_checks (*)
    `
    )
    .eq("borrower_id", userId);

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "active") {
      query = query.in("status", ["approved", "checked_out"]);
    } else if (statusFilter === "history") {
      query = query.in("status", ["completed", "returned", "rejected", "cancelled"]);
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error || !data) {
    console.error("[BookingService] Error fetching borrower bookings:", error?.message);
    return [];
  }

  const rawBookings = data as BookingWithRelations[];

  // Compute dynamic waiting-list position for any waitlisted items
  const bookingsWithPositions = await Promise.all(
    rawBookings.map(async (b) => {
      if (b.status === "waitlisted") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST count query
        const { count } = await (supabase.from("bookings") as any)
          .select("id", { count: "exact", head: true })
          .eq("resource_id", b.resource_id)
          .eq("status", "waitlisted")
          .lte("created_at", b.created_at);

        return { ...b, waitlist_position: count || 1 };
      }
      return b;
    })
  );

  return bookingsWithPositions;
}

/**
 * Retrieves bookings awaiting authorization for resources managed by the current custodian.
 */
export async function getManagedApprovals(
  userId: string,
  statusFilter: string = "pending"
): Promise<BookingWithRelations[]> {
  const supabase = await createClient();

  // Find all resources owned by user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data: ownedResources, error: resError } = await (supabase.from("resources") as any)
    .select("id")
    .eq("owner_id", userId);

  if (resError || !ownedResources || ownedResources.length === 0) {
    return [];
  }

  const resourceIds = ownedResources.map((r: { id: string }) => r.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST complex join inference workaround
  let query = (supabase.from("bookings") as any)
    .select(
      `
      *,
      resource:resources (
        *,
        institution:institutions (*),
        owner:profiles (
          id,
          full_name,
          avatar_url,
          role,
          verification_status
        )
      ),
      borrower:profiles!borrower_id (
        id,
        full_name,
        avatar_url,
        role,
        verification_status
      ),
      decision_reviewer:profiles!decision_by (
        id,
        full_name
      ),
      eligibility_checks (*)
    `
    )
    .in("resource_id", resourceIds);

  if (statusFilter === "pending") {
    query = query.eq("status", "requested");
    query = query.order("created_at", { ascending: true });
  } else if (statusFilter === "waitlist") {
    query = query.eq("status", "waitlisted");
    query = query.order("created_at", { ascending: true });
  } else if (statusFilter === "decided") {
    query = query.in("status", ["approved", "rejected"]);
    query = query.order("updated_at", { ascending: false });
  } else if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[BookingService] Error fetching managed approvals:", error?.message);
    return [];
  }

  const rawBookings = data as BookingWithRelations[];

  // Attach waitlist order
  const results = await Promise.all(
    rawBookings.map(async (b) => {
      if (b.status === "waitlisted") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST count query
        const { count } = await (supabase.from("bookings") as any)
          .select("id", { count: "exact", head: true })
          .eq("resource_id", b.resource_id)
          .eq("status", "waitlisted")
          .lte("created_at", b.created_at);

        return { ...b, waitlist_position: count || 1 };
      }
      return b;
    })
  );

  return results;
}

/**
 * Retrieves a single booking with relations if the visitor is an authorized participant.
 */
export async function getBookingById(
  bookingId: string,
  currentUserId: string
): Promise<BookingWithRelations | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST complex join inference workaround
  const { data, error } = await (supabase.from("bookings") as any)
    .select(
      `
      *,
      resource:resources (
        *,
        institution:institutions (*),
        owner:profiles (
          id,
          full_name,
          avatar_url,
          role,
          verification_status
        )
      ),
      borrower:profiles!borrower_id (
        id,
        full_name,
        avatar_url,
        role,
        verification_status
      ),
      decision_reviewer:profiles!decision_by (
        id,
        full_name
      ),
      eligibility_checks (*)
    `
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  const booking = data as BookingWithRelations;

  // Authorization check
  const isBorrower = booking.borrower_id === currentUserId;
  const isOwner = booking.resource.owner_id === currentUserId;

  if (!isBorrower && !isOwner) {
    return null;
  }

  if (booking.status === "waitlisted") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST count query
    const { count } = await (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .eq("resource_id", booking.resource_id)
      .eq("status", "waitlisted")
      .lte("created_at", booking.created_at);

    booking.waitlist_position = count || 1;
  }

  return booking;
}

/**
 * Checks whether an active booking (approved or checked_out) conflicts with a given time range.
 */
export async function checkResourceConflict(
  resourceId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: DbBooking | null }> {
  const supabase = await createClient();

  // Overlapping interval query: (start_time < candidate_end AND end_time > candidate_start)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST overlap query
  let query = (supabase.from("bookings") as any)
    .select("id, start_time, end_time, status")
    .eq("resource_id", resourceId)
    .in("status", ["approved", "checked_out"])
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.warn("[BookingService] Conflict query notice:", error.message);
    return { hasConflict: false };
  }

  if (data && data.length > 0) {
    return { hasConflict: true, conflictingBooking: data[0] as DbBooking };
  }

  return { hasConflict: false };
}

/**
 * Retrieves the count of pending booking requests for a user's owned resources.
 */
export async function getPendingApprovalsCount(userId: string): Promise<number> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data: ownedResources } = await (supabase.from("resources") as any)
    .select("id")
    .eq("owner_id", userId);

  if (!ownedResources || ownedResources.length === 0) {
    return 0;
  }

  const resourceIds = ownedResources.map((r: { id: string }) => r.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST count query
  const { count, error } = await (supabase.from("bookings") as any)
    .select("id", { count: "exact", head: true })
    .in("resource_id", resourceIds)
    .eq("status", "requested");

  if (error) return 0;
  return count || 0;
}
