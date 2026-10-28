import test from "node:test";
import assert from "node:assert/strict";

test("Booking time constraint enforces start_time < end_time", () => {
  const validateBookingInterval = (startTime, endTime) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (isNaN(start) || isNaN(end)) {
      return { valid: false, error: "Invalid timestamp format." };
    }
    if (start >= end) {
      return { valid: false, error: "start_time must precede end_time." };
    }
    return { valid: true };
  };

  assert.equal(
    validateBookingInterval("2026-11-01T10:00:00Z", "2026-11-01T12:00:00Z").valid,
    true
  );

  assert.equal(
    validateBookingInterval("2026-11-01T12:00:00Z", "2026-11-01T10:00:00Z").valid,
    false
  );

  assert.equal(
    validateBookingInterval("2026-11-01T10:00:00Z", "2026-11-01T10:00:00Z").valid,
    false
  );
});

test("PostgreSQL exclusion constraint logic rejects overlapping active reservations", () => {
  // Simulates PostgreSQL EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE status IN ('approved', 'checked_out')
  const activeBookings = [
    {
      id: "b1",
      resourceId: "res-1",
      start: new Date("2026-11-01T09:00:00Z").getTime(),
      end: new Date("2026-11-01T12:00:00Z").getTime(),
      status: "approved",
    },
    {
      id: "b2",
      resourceId: "res-1",
      start: new Date("2026-11-01T14:00:00Z").getTime(),
      end: new Date("2026-11-01T17:00:00Z").getTime(),
      status: "checked_out",
    },
  ];

  const checkConflict = (newBooking) => {
    // Only active statuses occupy reserved slots
    const activeStatuses = ["approved", "checked_out"];
    if (!activeStatuses.includes(newBooking.status)) {
      return false; // Requested/waitlisted/rejected/cancelled do not trigger exclusion conflict
    }

    const nStart = new Date(newBooking.start).getTime();
    const nEnd = new Date(newBooking.end).getTime();

    return activeBookings.some((existing) => {
      if (existing.resourceId !== newBooking.resourceId) return false;
      if (!activeStatuses.includes(existing.status)) return false;

      // Range overlap check: (StartA < EndB) and (EndA > StartB)
      return existing.start < nEnd && existing.end > nStart;
    });
  };

  // Overlap during approved morning slot (10:00 - 11:00 overlaps with 09:00 - 12:00)
  assert.equal(
    checkConflict({
      resourceId: "res-1",
      start: "2026-11-01T10:00:00Z",
      end: "2026-11-01T11:00:00Z",
      status: "approved",
    }),
    true
  );

  // Overlap with checked-out slot (13:30 - 14:30 overlaps with 14:00 - 17:00)
  assert.equal(
    checkConflict({
      resourceId: "res-1",
      start: "2026-11-01T13:30:00Z",
      end: "2026-11-01T14:30:00Z",
      status: "approved",
    }),
    true
  );

  // Non-overlapping interval (12:00 - 14:00 is between the two slots)
  assert.equal(
    checkConflict({
      resourceId: "res-1",
      start: "2026-11-01T12:00:00Z",
      end: "2026-11-01T14:00:00Z",
      status: "approved",
    }),
    false
  );

  // Non-overlapping resource (res-2 instead of res-1)
  assert.equal(
    checkConflict({
      resourceId: "res-2",
      start: "2026-11-01T09:00:00Z",
      end: "2026-11-01T12:00:00Z",
      status: "approved",
    }),
    false
  );

  // Inactive request status (e.g. 'requested') does not occupy confirmed slot
  assert.equal(
    checkConflict({
      resourceId: "res-1",
      start: "2026-11-01T10:00:00Z",
      end: "2026-11-01T11:00:00Z",
      status: "requested",
    }),
    false
  );
});
