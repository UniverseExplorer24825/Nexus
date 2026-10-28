import test from "node:test";
import assert from "node:assert/strict";

// 1. Checkout State & Authorization Guard
test("Checkout authorization and status guards enforce valid transition from approved only", () => {
  const canCheckout = ({ bookingStatus, callerId, borrowerId, custodianId, safetyAcknowledged }) => {
    if (!safetyAcknowledged) {
      return { allowed: false, error: "Safety acknowledgement required" };
    }
    const isParticipant = callerId === borrowerId || callerId === custodianId;
    if (!isParticipant) {
      return { allowed: false, error: "Unauthorized: caller is not a booking participant" };
    }
    if (bookingStatus !== "approved") {
      return { allowed: false, error: `Cannot checkout booking in status "${bookingStatus}"` };
    }
    return { allowed: true };
  };

  const borrowerId = "user-borrower-1";
  const custodianId = "user-custodian-9";
  const unrelatedId = "user-unrelated-3";

  // 1. Approved booking checked out by borrower with safety acknowledged -> allowed
  assert.equal(
    canCheckout({
      bookingStatus: "approved",
      callerId: borrowerId,
      borrowerId,
      custodianId,
      safetyAcknowledged: true,
    }).allowed,
    true
  );

  // Custodian handover -> allowed
  assert.equal(
    canCheckout({
      bookingStatus: "approved",
      callerId: custodianId,
      borrowerId,
      custodianId,
      safetyAcknowledged: true,
    }).allowed,
    true
  );

  // Missing safety acknowledgment -> rejected
  assert.equal(
    canCheckout({
      bookingStatus: "approved",
      callerId: borrowerId,
      borrowerId,
      custodianId,
      safetyAcknowledged: false,
    }).allowed,
    false
  );

  // 2. Unapproved booking cannot be checked out
  const invalidStatuses = ["requested", "waitlisted", "checked_out", "returned", "completed", "rejected", "cancelled"];
  for (const status of invalidStatuses) {
    const res = canCheckout({
      bookingStatus: status,
      callerId: borrowerId,
      borrowerId,
      custodianId,
      safetyAcknowledged: true,
    });
    assert.equal(res.allowed, false, `Status "${status}" should not be checkout-eligible`);
  }

  // 3. Unrelated user cannot checkout another user's booking
  assert.equal(
    canCheckout({
      bookingStatus: "approved",
      callerId: unrelatedId,
      borrowerId,
      custodianId,
      safetyAcknowledged: true,
    }).allowed,
    false
  );
});

// 2. Return Submission & Lateness Calculation
test("Return submission requires checked_out status and accurately calculates lateness", () => {
  const calculateReturn = ({ bookingStatus, endTimeStr, returnTimeStr }) => {
    if (bookingStatus !== "checked_out") {
      return { valid: false, error: `Cannot return booking in status "${bookingStatus}"` };
    }

    const scheduledEnd = new Date(endTimeStr);
    const returnTime = new Date(returnTimeStr);

    const isLate = returnTime.getTime() > scheduledEnd.getTime();
    const lateMinutes = isLate
      ? Math.max(0, Math.floor((returnTime.getTime() - scheduledEnd.getTime()) / 60000))
      : 0;

    return {
      valid: true,
      isLate,
      lateMinutes,
    };
  };

  const scheduledEnd = "2026-10-28T14:00:00Z";

  // On-time return (returned 10 minutes before scheduled end)
  const onTime = calculateReturn({
    bookingStatus: "checked_out",
    endTimeStr: scheduledEnd,
    returnTimeStr: "2026-10-28T13:50:00Z",
  });
  assert.equal(onTime.valid, true);
  assert.equal(onTime.isLate, false);
  assert.equal(onTime.lateMinutes, 0);

  // Exactly on-time
  const exact = calculateReturn({
    bookingStatus: "checked_out",
    endTimeStr: scheduledEnd,
    returnTimeStr: "2026-10-28T14:00:00Z",
  });
  assert.equal(exact.valid, true);
  assert.equal(exact.isLate, false);
  assert.equal(exact.lateMinutes, 0);

  // Late return (returned 45 minutes late)
  const late = calculateReturn({
    bookingStatus: "checked_out",
    endTimeStr: scheduledEnd,
    returnTimeStr: "2026-10-28T14:45:00Z",
  });
  assert.equal(late.valid, true);
  assert.equal(late.isLate, true);
  assert.equal(late.lateMinutes, 45);

  // Cannot return an approved or requested booking
  assert.equal(
    calculateReturn({
      bookingStatus: "approved",
      endTimeStr: scheduledEnd,
      returnTimeStr: "2026-10-28T14:00:00Z",
    }).valid,
    false
  );
});

// 3. Return Inspection Authorization & Self-Approval Prevention
test("Borrower cannot approve their own return inspection; only custodian can verify and complete", () => {
  const canInspectReturn = ({ bookingStatus, callerId, borrowerId, custodianId }) => {
    if (bookingStatus !== "returned") {
      return { allowed: false, error: "Only bookings in returned status can be inspected" };
    }

    if (callerId !== custodianId) {
      return { allowed: false, error: "Unauthorized: only the custodian can inspect returns" };
    }

    // Explicit self-inspection check
    if (callerId === borrowerId) {
      return { allowed: false, error: "Borrowers cannot review or approve their own return inspection" };
    }

    return { allowed: true };
  };

  const borrowerId = "user-borrower-1";
  const custodianId = "user-custodian-9";
  const unrelatedId = "user-other-2";

  // Custodian inspecting returned booking -> allowed
  assert.equal(
    canInspectReturn({
      bookingStatus: "returned",
      callerId: custodianId,
      borrowerId,
      custodianId,
      decision: "completed",
    }).allowed,
    true
  );

  // Borrower attempting to approve own return -> blocked!
  assert.equal(
    canInspectReturn({
      bookingStatus: "returned",
      callerId: borrowerId,
      borrowerId,
      custodianId,
      decision: "completed",
    }).allowed,
    false
  );

  // If a custodian managed to be the borrower, self-approval is still blocked
  assert.equal(
    canInspectReturn({
      bookingStatus: "returned",
      callerId: custodianId,
      borrowerId: custodianId,
      custodianId,
      decision: "completed",
    }).allowed,
    false
  );

  // Unrelated user -> blocked
  assert.equal(
    canInspectReturn({
      bookingStatus: "returned",
      callerId: unrelatedId,
      borrowerId,
      custodianId,
      decision: "completed",
    }).allowed,
    false
  );
});

// 4. Incident Routing & Completion Guard
test("Damage or discrepancy report routes to incident and unresolved incidents block completion", () => {
  const evaluateCompletion = ({ decision, openIncidentsCount }) => {
    if (decision === "flag_incident") {
      return {
        completed: false,
        routedToIncident: true,
        status: "incident_opened",
      };
    }

    if (decision === "completed") {
      if (openIncidentsCount > 0) {
        return {
          completed: false,
          error: `Cannot complete booking: There are ${openIncidentsCount} unresolved incident report(s)`,
        };
      }
      return {
        completed: true,
        status: "completed",
      };
    }

    return { completed: false, error: "Invalid decision" };
  };

  // Clean return with 0 incidents -> completes
  const clean = evaluateCompletion({ decision: "completed", openIncidentsCount: 0 });
  assert.equal(clean.completed, true);
  assert.equal(clean.status, "completed");

  // Attempt to complete when an unresolved incident exists -> blocked!
  const blocked = evaluateCompletion({ decision: "completed", openIncidentsCount: 2 });
  assert.equal(blocked.completed, false);
  assert.match(blocked.error, /unresolved incident/);

  // Flag incident -> does not complete cleanly, routes to incident management
  const flagged = evaluateCompletion({ decision: "flag_incident", openIncidentsCount: 0 });
  assert.equal(flagged.completed, false);
  assert.equal(flagged.routedToIncident, true);
});

// 5. Overdue Detection Logic
test("Overdue detection accurately detects active loans past deadline and computes duration", () => {
  const computeOverdue = (booking, now = new Date("2026-10-28T16:00:00Z")) => {
    const isCheckedOut = booking.status === "checked_out";
    const endTime = new Date(booking.end_time);
    const isOverdue = isCheckedOut && now.getTime() > endTime.getTime();

    if (!isOverdue) {
      return { is_overdue: false, overdue_duration_text: null };
    }

    const diffMs = now.getTime() - endTime.getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let durationText = "";
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      durationText = `${diffDays}d ${remainingHours}h`;
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      durationText = `${diffHours}h ${remainingMinutes}m`;
    } else {
      durationText = `${diffMinutes}m`;
    }

    return { is_overdue: true, overdue_duration_text: durationText };
  };

  const fixedNow = new Date("2026-10-28T16:00:00Z");

  // Booking checked out with end_time in future -> not overdue
  assert.equal(
    computeOverdue(
      { status: "checked_out", end_time: "2026-10-28T18:00:00Z" },
      fixedNow
    ).is_overdue,
    false
  );

  // Booking checked out with end_time 45 minutes in past -> overdue by 45m
  const res45m = computeOverdue(
    { status: "checked_out", end_time: "2026-10-28T15:15:00Z" },
    fixedNow
  );
  assert.equal(res45m.is_overdue, true);
  assert.equal(res45m.overdue_duration_text, "45m");

  // Booking checked out with end_time 3 hours 20 minutes in past -> overdue by 3h 20m
  const res3h = computeOverdue(
    { status: "checked_out", end_time: "2026-10-28T12:40:00Z" },
    fixedNow
  );
  assert.equal(res3h.is_overdue, true);
  assert.equal(res3h.overdue_duration_text, "3h 20m");

  // Booking already returned or completed -> never overdue, regardless of end_time
  assert.equal(
    computeOverdue(
      { status: "returned", end_time: "2026-10-28T12:00:00Z" },
      fixedNow
    ).is_overdue,
    false
  );
  assert.equal(
    computeOverdue(
      { status: "completed", end_time: "2026-10-28T12:00:00Z" },
      fixedNow
    ).is_overdue,
    false
  );
});

// 6. Photo Storage Upload Constraints
test("Condition and incident photo validation enforces MIME types and 5MB size limit", () => {
  const validateConditionPhoto = (file) => {
    if (!file || file.size === 0) {
      return { valid: false, error: "No photo provided" };
    }
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return { valid: false, error: "Photo file exceeds maximum 5MB size limit" };
    }
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      return { valid: false, error: "Unsupported photo format. Allowed formats: JPEG, PNG, WebP" };
    }
    return { valid: true };
  };

  // Valid JPEG, 2MB
  assert.equal(
    validateConditionPhoto({ name: "microscope.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 })
      .valid,
    true
  );

  // Valid PNG, 4.5MB
  assert.equal(
    validateConditionPhoto({ name: "defect.png", type: "image/png", size: 4.5 * 1024 * 1024 }).valid,
    true
  );

  // Valid WebP, 500KB
  assert.equal(
    validateConditionPhoto({ name: "lens.webp", type: "image/webp", size: 500 * 1024 }).valid,
    true
  );

  // File exceeds 5MB
  assert.equal(
    validateConditionPhoto({ name: "large.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 }).valid,
    false
  );

  // Disallowed MIME types (e.g. executable, pdf, svg)
  assert.equal(
    validateConditionPhoto({ name: "hack.exe", type: "application/x-msdownload", size: 1000 }).valid,
    false
  );
  assert.equal(
    validateConditionPhoto({ name: "manual.pdf", type: "application/pdf", size: 1000 }).valid,
    false
  );
  assert.equal(
    validateConditionPhoto({ name: "vector.svg", type: "image/svg+xml", size: 1000 }).valid,
    false
  );
});
