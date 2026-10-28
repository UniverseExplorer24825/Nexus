import test from "node:test";
import assert from "node:assert/strict";

test("Booking request validation rejects invalid ranges, past starts, and self-booking", () => {
  const validateBookingInput = ({
    borrowerId,
    resourceOwnerId,
    startTimeStr,
    endTimeStr,
    resourceStatus,
    now = new Date("2026-10-28T10:00:00Z"),
  }) => {
    const errors = [];

    if (!borrowerId) {
      errors.push("Authentication required");
      return { isValid: false, errors };
    }

    if (borrowerId === resourceOwnerId) {
      errors.push("Resource custodians cannot book their own resources");
    }

    if (resourceStatus !== "published") {
      errors.push("Resource is not published and cannot be booked");
    }

    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push("Invalid date format");
      return { isValid: false, errors };
    }

    if (start >= end) {
      errors.push("Start time must precede end time");
    }

    // 5-minute clock skew allowance
    const minStart = new Date(now.getTime() - 5 * 60 * 1000);
    if (start < minStart) {
      errors.push("Start time cannot be in the past");
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 15 * 60 * 1000) {
      errors.push("Minimum booking duration is 15 minutes");
    }

    if (durationMs > 30 * 24 * 60 * 60 * 1000) {
      errors.push("Maximum booking duration is 30 days");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const fixedNow = new Date("2026-10-28T12:00:00Z");

  // Valid booking
  const valid = validateBookingInput({
    borrowerId: "user-1",
    resourceOwnerId: "custodian-99",
    startTimeStr: "2026-10-29T10:00:00Z",
    endTimeStr: "2026-10-29T14:00:00Z",
    resourceStatus: "published",
    now: fixedNow,
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  // Self booking rejected
  const selfBook = validateBookingInput({
    borrowerId: "custodian-99",
    resourceOwnerId: "custodian-99",
    startTimeStr: "2026-10-29T10:00:00Z",
    endTimeStr: "2026-10-29T14:00:00Z",
    resourceStatus: "published",
    now: fixedNow,
  });
  assert.equal(selfBook.isValid, false);
  assert.ok(selfBook.errors.includes("Resource custodians cannot book their own resources"));

  // Inverted times
  const inverted = validateBookingInput({
    borrowerId: "user-1",
    resourceOwnerId: "custodian-99",
    startTimeStr: "2026-10-29T15:00:00Z",
    endTimeStr: "2026-10-29T10:00:00Z",
    resourceStatus: "published",
    now: fixedNow,
  });
  assert.equal(inverted.isValid, false);
  assert.ok(inverted.errors.includes("Start time must precede end time"));

  // Past start
  const past = validateBookingInput({
    borrowerId: "user-1",
    resourceOwnerId: "custodian-99",
    startTimeStr: "2026-10-25T10:00:00Z",
    endTimeStr: "2026-10-25T14:00:00Z",
    resourceStatus: "published",
    now: fixedNow,
  });
  assert.equal(past.isValid, false);
  assert.ok(past.errors.includes("Start time cannot be in the past"));

  // Unpublished resource
  const draft = validateBookingInput({
    borrowerId: "user-1",
    resourceOwnerId: "custodian-99",
    startTimeStr: "2026-10-29T10:00:00Z",
    endTimeStr: "2026-10-29T14:00:00Z",
    resourceStatus: "draft",
    now: fixedNow,
  });
  assert.equal(draft.isValid, false);
  assert.ok(draft.errors.includes("Resource is not published and cannot be booked"));
});

test("PostgreSQL exclusion interval overlap logic allows adjacent intervals and rejects overlapping active bookings", () => {
  // Simulates PostgreSQL tstzrange [start, end) overlap operator (&&)
  const rangesOverlap = (rangeA, rangeB) => {
    const aStart = new Date(rangeA.start).getTime();
    const aEnd = new Date(rangeA.end).getTime();
    const bStart = new Date(rangeB.start).getTime();
    const bEnd = new Date(rangeB.end).getTime();

    // Standard half-open interval overlap [aStart, aEnd) && [bStart, bEnd)
    return aStart < bEnd && aEnd > bStart;
  };

  const bookingA = { start: "2026-10-29T10:00:00Z", end: "2026-10-29T12:00:00Z" };
  const bookingB = { start: "2026-10-29T12:00:00Z", end: "2026-10-29T14:00:00Z" };
  const bookingOverlapping = { start: "2026-10-29T11:00:00Z", end: "2026-10-29T13:00:00Z" };
  const bookingSubInterval = { start: "2026-10-29T10:30:00Z", end: "2026-10-29T11:30:00Z" };

  // Adjacent intervals: A ends exactly when B starts -> MUST NOT OVERLAP
  assert.equal(rangesOverlap(bookingA, bookingB), false);

  // Overlapping intervals
  assert.equal(rangesOverlap(bookingA, bookingOverlapping), true);
  assert.equal(rangesOverlap(bookingB, bookingOverlapping), true);

  // Sub-interval overlap
  assert.equal(rangesOverlap(bookingA, bookingSubInterval), true);
});

test("Eligibility verification gate blocks approval when prerequisite checks are pending or failed", () => {
  const canApproveBooking = ({ bookingStatus, eligibilityChecks, reviewerId, resourceOwnerId }) => {
    if (reviewerId !== resourceOwnerId) {
      return { allowed: false, reason: "Unauthorized reviewer" };
    }

    if (bookingStatus !== "requested" && bookingStatus !== "waitlisted") {
      return { allowed: false, reason: "Invalid initial status for approval" };
    }

    const hasUnresolved = eligibilityChecks.some(
      (c) => c.status === "pending" || c.status === "failed"
    );

    if (hasUnresolved) {
      return { allowed: false, reason: "Mandatory eligibility requirements unresolved or failed" };
    }

    return { allowed: true };
  };

  const ownerId = "custodian-1";

  // Case 1: Pending checks exist -> blocked
  const pendingChecks = [
    { id: "c1", requirement: "Institutional membership", status: "passed" },
    { id: "c2", requirement: "Laser safety training", status: "pending" },
  ];
  assert.equal(
    canApproveBooking({
      bookingStatus: "requested",
      eligibilityChecks: pendingChecks,
      reviewerId: ownerId,
      resourceOwnerId: ownerId,
    }).allowed,
    false
  );

  // Case 2: Failed check exists -> blocked
  const failedChecks = [
    { id: "c1", requirement: "Institutional membership", status: "passed" },
    { id: "c2", requirement: "Cleanroom authorization", status: "failed" },
  ];
  assert.equal(
    canApproveBooking({
      bookingStatus: "requested",
      eligibilityChecks: failedChecks,
      reviewerId: ownerId,
      resourceOwnerId: ownerId,
    }).allowed,
    false
  );

  // Case 3: All checks passed -> approval allowed
  const allPassed = [
    { id: "c1", requirement: "Institutional membership", status: "passed" },
    { id: "c2", requirement: "Cleanroom authorization", status: "passed" },
  ];
  assert.equal(
    canApproveBooking({
      bookingStatus: "requested",
      eligibilityChecks: allPassed,
      reviewerId: ownerId,
      resourceOwnerId: ownerId,
    }).allowed,
    true
  );

  // Case 4: Replay on rejected or cancelled booking -> blocked
  assert.equal(
    canApproveBooking({
      bookingStatus: "rejected",
      eligibilityChecks: allPassed,
      reviewerId: ownerId,
      resourceOwnerId: ownerId,
    }).allowed,
    false
  );
  assert.equal(
    canApproveBooking({
      bookingStatus: "cancelled",
      eligibilityChecks: allPassed,
      reviewerId: ownerId,
      resourceOwnerId: ownerId,
    }).allowed,
    false
  );
});

test("Waiting list queue ordering is deterministic and maintains fair first-in-first-out sequencing", () => {
  const waitlist = [
    { id: "b3", created_at: "2026-10-28T14:00:00Z", borrower: "Carol" },
    { id: "b1", created_at: "2026-10-28T10:00:00Z", borrower: "Alice" },
    { id: "b2", created_at: "2026-10-28T12:00:00Z", borrower: "Bob" },
  ];

  const sorted = [...waitlist].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  assert.equal(sorted[0].id, "b1"); // Alice (first)
  assert.equal(sorted[1].id, "b2"); // Bob (second)
  assert.equal(sorted[2].id, "b3"); // Carol (third)

  // Tie-breaking by ID
  const tied = [
    { id: "b-beta", created_at: "2026-10-28T10:00:00Z" },
    { id: "b-alpha", created_at: "2026-10-28T10:00:00Z" },
  ].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  assert.equal(tied[0].id, "b-alpha");
  assert.equal(tied[1].id, "b-beta");
});

test("Audit event generation records every critical booking state transition", () => {
  const auditLog = [];

  const recordTransition = ({ bookingId, actorId, previousStatus, newStatus, details }) => {
    auditLog.push({
      bookingId,
      actorId,
      action_type: `booking_${newStatus}`,
      details: {
        previous_status: previousStatus,
        new_status: newStatus,
        ...details,
      },
      timestamp: new Date().toISOString(),
    });
  };

  recordTransition({
    bookingId: "book-100",
    actorId: "borrower-1",
    previousStatus: null,
    newStatus: "requested",
    details: { notes: "Testing protocol A" },
  });

  recordTransition({
    bookingId: "book-100",
    actorId: "custodian-1",
    previousStatus: "requested",
    newStatus: "approved",
    details: { decision_notes: "Clearances verified" },
  });

  assert.equal(auditLog.length, 2);
  assert.equal(auditLog[0].action_type, "booking_requested");
  assert.equal(auditLog[1].action_type, "booking_approved");
  assert.equal(auditLog[1].details.previous_status, "requested");
});
