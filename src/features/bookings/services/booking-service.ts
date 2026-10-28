import { createClient } from "@/lib/supabase/server";
import type { BookingWithRelations, DbBooking, DbNotification } from "../types";

/**
 * Computes accurate overdue metadata based on end_time and current timestamp.
 */
export function computeOverdueMetadata(booking: BookingWithRelations): BookingWithRelations {
  if (booking.status === "checked_out") {
    const end = new Date(booking.end_time).getTime();
    const now = Date.now();
    if (now > end) {
      const diffMs = now - end;
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      const diffDays = Math.floor(diffHours / 24);

      let text = "";
      if (diffDays > 0) {
        text = `Overdue by ${diffDays}d ${diffHours % 24}h`;
      } else if (diffHours > 0) {
        text = `Overdue by ${diffHours}h ${remainingMins}m`;
      } else {
        text = `Overdue by ${diffMins}m`;
      }

      return {
        ...booking,
        is_overdue: true,
        overdue_duration_text: text,
      };
    }
  }

  return {
    ...booking,
    is_overdue: false,
    overdue_duration_text: null,
  };
}

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
      eligibility_checks (*),
      condition_reports (*),
      incidents (*)
    `
    )
    .eq("borrower_id", userId);

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "active") {
      query = query.in("status", ["approved", "checked_out"]);
    } else if (statusFilter === "overdue") {
      query = query.eq("status", "checked_out").lt("end_time", new Date().toISOString());
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

  const rawBookings = (data as BookingWithRelations[]).map(computeOverdueMetadata);

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
 * Retrieves bookings awaiting authorization or inspection for resources managed by the current custodian.
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
      eligibility_checks (*),
      condition_reports (*),
      incidents (*)
    `
    )
    .in("resource_id", resourceIds);

  if (statusFilter === "pending") {
    query = query.eq("status", "requested");
    query = query.order("created_at", { ascending: true });
  } else if (statusFilter === "inspection") {
    query = query.eq("status", "returned");
    query = query.order("updated_at", { ascending: false });
  } else if (statusFilter === "active") {
    query = query.in("status", ["approved", "checked_out"]);
    query = query.order("start_time", { ascending: true });
  } else if (statusFilter === "overdue") {
    query = query.eq("status", "checked_out").lt("end_time", new Date().toISOString());
    query = query.order("end_time", { ascending: true });
  } else if (statusFilter === "waitlist") {
    query = query.eq("status", "waitlisted");
    query = query.order("created_at", { ascending: true });
  } else if (statusFilter === "decided") {
    query = query.in("status", ["approved", "rejected", "completed"]);
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

  const rawBookings = (data as BookingWithRelations[]).map(computeOverdueMetadata);

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
      eligibility_checks (*),
      condition_reports (*),
      incidents (*)
    `
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  let booking = computeOverdueMetadata(data as BookingWithRelations);

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

    booking = { ...booking, waitlist_position: count || 1 };
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
 * Retrieves counts for custodian summary tabs.
 */
export async function getCustodianActionCounts(userId: string): Promise<{
  pendingRequests: number;
  awaitingInspection: number;
  activeLoans: number;
  overdueLoans: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data: ownedResources } = await (supabase.from("resources") as any)
    .select("id")
    .eq("owner_id", userId);

  if (!ownedResources || ownedResources.length === 0) {
    return { pendingRequests: 0, awaitingInspection: 0, activeLoans: 0, overdueLoans: 0 };
  }

  const resourceIds = ownedResources.map((r: { id: string }) => r.id);
  const nowIso = new Date().toISOString();

  const [
    { count: pendingCount },
    { count: inspectionCount },
    { count: activeCount },
    { count: overdueCount },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .in("resource_id", resourceIds)
      .eq("status", "requested"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .in("resource_id", resourceIds)
      .eq("status", "returned"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .in("resource_id", resourceIds)
      .in("status", ["approved", "checked_out"]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("bookings") as any)
      .select("id", { count: "exact", head: true })
      .in("resource_id", resourceIds)
      .eq("status", "checked_out")
      .lt("end_time", nowIso),
  ]);

  return {
    pendingRequests: pendingCount || 0,
    awaitingInspection: inspectionCount || 0,
    activeLoans: activeCount || 0,
    overdueLoans: overdueCount || 0,
  };
}

/**
 * Retrieves the count of pending booking requests for a user's owned resources.
 */
export async function getPendingApprovalsCount(userId: string): Promise<number> {
  const { pendingRequests } = await getCustodianActionCounts(userId);
  return pendingRequests;
}

/**
 * Retrieves unread notifications for a user.
 */
export async function getUserNotifications(userId: string): Promise<DbNotification[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST select query
  const { data, error } = await (supabase.from("notifications") as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as DbNotification[];
}

/**
 * Creates an in-app notification record for important lifecycle milestones.
 */
export async function sendInAppNotification(
  userId: string,
  title: string,
  message: string,
  category: string,
  bookingId?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST insert query
    await (supabase.from("notifications") as any).insert({
      user_id: userId,
      title,
      message,
      category,
      booking_id: bookingId || null,
      is_read: false,
    });
  } catch (err) {
    console.warn("[BookingService] Notification creation notice:", err);
  }
}
