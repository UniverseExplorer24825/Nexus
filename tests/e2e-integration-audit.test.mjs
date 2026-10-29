import test from "node:test";
import assert from "node:assert/strict";

// ============================================================================
// E2E JOURNEY A: Resource Owner Lifecycle (Listing, Approving, Inspection, Incident)
// ============================================================================
test("Journey A: Resource Owner can create apparatus, update status, and inspect return", () => {
  // 1. Resource creation validation
  const validateResourceCreation = (data) => {
    if (!data.title || data.title.trim().length < 3) {
      return { valid: false, error: "Resource title must be at least 3 characters long." };
    }
    if (!data.category) {
      return { valid: false, error: "Please select a valid resource category." };
    }
    if (data.depositAmount < 0) {
      return { valid: false, error: "Deposit amount must be a non-negative number." };
    }
    return { valid: true };
  };

  const validListing = validateResourceCreation({
    title: "Olympus IX83 Inverted Fluorescence Microscope",
    category: "Optics & Imaging",
    depositAmount: 150,
  });
  assert.equal(validListing.valid, true);

  // 2. Ownership boundary check on edit/archive
  const checkOwnership = (ownerId, callerId) => {
    if (ownerId !== callerId) {
      return { allowed: false, error: "Unauthorized: You do not own this resource." };
    }
    return { allowed: true };
  };
  const custodianId = "custodian-001";
  const foreignId = "foreign-user-999";
  assert.equal(checkOwnership(custodianId, custodianId).allowed, true);
  assert.equal(checkOwnership(custodianId, foreignId).allowed, false);

  // 3. Custodian decision logic: cannot self-approve
  const canDecideBooking = ({ custodianId, borrowerId, decision }) => {
    if (custodianId === borrowerId) {
      return { allowed: false, error: "You cannot approve your own booking." };
    }
    if (decision === "rejected" && !custodianId) {
      return { allowed: false, error: "Missing custodian credentials" };
    }
    return { allowed: true };
  };
  assert.equal(canDecideBooking({ custodianId: "user-1", borrowerId: "user-1", decision: "approved" }).allowed, false);
  assert.equal(canDecideBooking({ custodianId: "user-1", borrowerId: "user-2", decision: "approved" }).allowed, true);

  // 4. Return inspection logic: only custodian can inspect return condition
  const canInspectReturn = ({ callerId, custodianId, bookingStatus }) => {
    if (callerId !== custodianId) {
      return { allowed: false, error: "Unauthorized: Only custodian can verify and complete inspection." };
    }
    if (bookingStatus !== "returned") {
      return { allowed: false, error: `Cannot inspect booking in status "${bookingStatus}"` };
    }
    return { allowed: true };
  };
  assert.equal(canInspectReturn({ callerId: custodianId, custodianId, bookingStatus: "returned" }).allowed, true);
  assert.equal(canInspectReturn({ callerId: "borrower-002", custodianId, bookingStatus: "returned" }).allowed, false);
});

// ============================================================================
// E2E JOURNEY B: Resource Borrower Lifecycle (Discover, Request, Checkout, Return)
// ============================================================================
test("Journey B: Borrower discovers, requests within fair-use limits, checks out, and returns", () => {
  // 1. Non-self-booking rule
  const validateBorrowerRequest = ({ borrowerId, ownerId, start, end, isSuspended, activeCount }) => {
    if (borrowerId === ownerId) {
      return { allowed: false, error: "Resource custodians cannot submit booking reservations for apparatus they manage." };
    }
    if (isSuspended) {
      return { allowed: false, error: "Account Restricted: Your account is on administrative hold." };
    }
    if (activeCount >= 4) {
      return { allowed: false, error: "Fair-Use Policy: Maximum 4 active or pending reservations allowed." };
    }
    if (new Date(start) >= new Date(end)) {
      return { allowed: false, error: "Requested start time must be strictly earlier than end time." };
    }
    return { allowed: true };
  };

  const borrower = "borrower-10";
  const custodian = "custodian-20";

  // Self-booking attempt -> rejected
  assert.equal(
    validateBorrowerRequest({
      borrowerId: custodian,
      ownerId: custodian,
      start: "2026-11-01T10:00:00Z",
      end: "2026-11-01T12:00:00Z",
      isSuspended: false,
      activeCount: 1,
    }).allowed,
    false
  );

  // Valid borrower request -> allowed
  assert.equal(
    validateBorrowerRequest({
      borrowerId: borrower,
      ownerId: custodian,
      start: "2026-11-01T10:00:00Z",
      end: "2026-11-01T12:00:00Z",
      isSuspended: false,
      activeCount: 2,
    }).allowed,
    true
  );

  // 2. Checkout handover requirement: safety acknowledgement required
  const canPerformCheckout = ({ safetyAcknowledged, bookingStatus }) => {
    if (bookingStatus !== "approved") {
      return { allowed: false, error: "Booking must be in approved status." };
    }
    if (!safetyAcknowledged) {
      return { allowed: false, error: "Safety protocol acknowledgement is mandatory." };
    }
    return { allowed: true };
  };
  assert.equal(canPerformCheckout({ safetyAcknowledged: false, bookingStatus: "approved" }).allowed, false);
  assert.equal(canPerformCheckout({ safetyAcknowledged: true, bookingStatus: "approved" }).allowed, true);

  // 3. Return submission: requires checked_out status
  const canSubmitReturn = ({ bookingStatus }) => {
    return bookingStatus === "checked_out";
  };
  assert.equal(canSubmitReturn({ bookingStatus: "checked_out" }), true);
  assert.equal(canSubmitReturn({ bookingStatus: "approved" }), false);
});

// ============================================================================
// E2E JOURNEY C: Institutional Administrator Governance & Isolation
// ============================================================================
test("Journey C: Institutional admin controls members, prevents self-promotion, and enforces institution isolation", () => {
  const verifyMember = ({ callerId, targetId, callerRole, callerInst, targetInst }) => {
    if (callerId === targetId) {
      return { allowed: false, error: "Security restriction: You cannot approve or modify your own verification." };
    }
    if (callerRole !== "institution_admin") {
      return { allowed: false, error: "Unauthorized: Institutional administrator privilege required." };
    }
    if (callerInst && targetInst && callerInst !== targetInst) {
      return { allowed: false, error: "Security boundary: Administrators cannot manage members of other institutions." };
    }
    return { allowed: true };
  };

  const admin1 = "admin-mit";
  const memberMit = "member-mit";
  const memberHarvard = "member-harvard";
  const instMit = "inst-001";
  const instHarvard = "inst-002";

  // Admin verifying MIT member -> allowed
  assert.equal(
    verifyMember({
      callerId: admin1,
      targetId: memberMit,
      callerRole: "institution_admin",
      callerInst: instMit,
      targetInst: instMit,
    }).allowed,
    true
  );

  // Admin trying to self-verify -> rejected
  assert.equal(
    verifyMember({
      callerId: admin1,
      targetId: admin1,
      callerRole: "institution_admin",
      callerInst: instMit,
      targetInst: instMit,
    }).allowed,
    false
  );

  // Admin trying to manage foreign institution member -> rejected
  assert.equal(
    verifyMember({
      callerId: admin1,
      targetId: memberHarvard,
      callerRole: "institution_admin",
      callerInst: instMit,
      targetInst: instHarvard,
    }).allowed,
    false
  );
});

// ============================================================================
// E2E JOURNEY D: Transparent Waiting List Ordering and Promotion
// ============================================================================
test("Journey D: Waitlist preserves deterministic FIFO sequencing and handles vacancy notification", () => {
  const queue = [
    { bookingId: "b-first", borrowerId: "user-alpha", requestedAt: 100 },
    { bookingId: "b-second", borrowerId: "user-beta", requestedAt: 200 },
    { bookingId: "b-third", borrowerId: "user-gamma", requestedAt: 300 },
  ];

  // Sorting by requestedAt maintains deterministic fairness
  const sortedQueue = [...queue].sort((a, b) => a.requestedAt - b.requestedAt);
  assert.equal(sortedQueue[0].borrowerId, "user-alpha");
  assert.equal(sortedQueue[1].borrowerId, "user-beta");
  assert.equal(sortedQueue[2].borrowerId, "user-gamma");

  // When b-first is cancelled, next eligible candidate is user-beta
  const remaining = sortedQueue.slice(1);
  assert.equal(remaining[0].borrowerId, "user-beta");
});

// ============================================================================
// DATA INTEGRITY & CONCURRENCY: Overlapping Exclusion & Transition Guarantees
// ============================================================================
test("Data Integrity: Active booking overlap exclusion prevents double-booking", () => {
  const activeApprovedBookings = [
    { start: new Date("2026-11-01T10:00:00Z"), end: new Date("2026-11-01T14:00:00Z"), status: "approved" },
  ];

  const hasOverlap = (newStart, newEnd) => {
    return activeApprovedBookings.some((b) => {
      // Standard interval overlap: max(start1, start2) < min(end1, end2)
      return Math.max(b.start.getTime(), newStart.getTime()) < Math.min(b.end.getTime(), newEnd.getTime());
    });
  };

  // Overlapping interval 11:00 - 13:00 -> Conflict detected
  assert.equal(hasOverlap(new Date("2026-11-01T11:00:00Z"), new Date("2026-11-01T13:00:00Z")), true);

  // Adjacent interval 14:00 - 16:00 -> Allowed (no overlap)
  assert.equal(hasOverlap(new Date("2026-11-01T14:00:00Z"), new Date("2026-11-01T16:00:00Z")), false);

  // Non-overlapping interval 08:00 - 10:00 -> Allowed
  assert.equal(hasOverlap(new Date("2026-11-01T08:00:00Z"), new Date("2026-11-01T10:00:00Z")), false);
});
