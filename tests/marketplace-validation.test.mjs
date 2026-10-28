import test from "node:test";
import assert from "node:assert/strict";

test("Resource listing payload validation rejects invalid titles and negative deposits", () => {
  const validateResourceInput = (input) => {
    const errors = [];

    if (!input.title || input.title.trim().length < 3) {
      errors.push("Title must be at least 3 characters");
    }

    if (input.title && input.title.length > 150) {
      errors.push("Title cannot exceed 150 characters");
    }

    if (input.deposit_amount !== undefined && input.deposit_amount < 0) {
      errors.push("Deposit amount cannot be negative");
    }

    const validCategories = [
      "Analytical & Testing",
      "Fabrication & CNC",
      "Computing & Server Hardware",
      "Cleanrooms & Specialized Spaces",
      "Optics & Imaging",
      "Electronics & Embedded",
      "Robotics & Automation",
      "General Equipment",
    ];

    if (input.category && !validCategories.includes(input.category)) {
      errors.push("Invalid category");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Valid resource
  const valid = validateResourceInput({
    title: "Olympus BX53 Microscope",
    category: "Optics & Imaging",
    deposit_amount: 150,
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  // Invalid: title too short
  const shortTitle = validateResourceInput({
    title: "Ab",
    category: "Optics & Imaging",
    deposit_amount: 0,
  });
  assert.equal(shortTitle.isValid, false);
  assert.ok(shortTitle.errors.includes("Title must be at least 3 characters"));

  // Invalid: negative deposit
  const negativeDeposit = validateResourceInput({
    title: "Laser Cutter",
    category: "Fabrication & CNC",
    deposit_amount: -50,
  });
  assert.equal(negativeDeposit.isValid, false);
  assert.ok(negativeDeposit.errors.includes("Deposit amount cannot be negative"));

  // Invalid: unapproved category
  const badCategory = validateResourceInput({
    title: "Random Tool",
    category: "Crypto Miner",
    deposit_amount: 0,
  });
  assert.equal(badCategory.isValid, false);
  assert.ok(badCategory.errors.includes("Invalid category"));
});

test("Availability schedule validation rejects inverted intervals and invalid days", () => {
  const validateAvailabilitySlot = (slot) => {
    if (typeof slot.day_of_week !== "number" || slot.day_of_week < 0 || slot.day_of_week > 6) {
      return { valid: false, error: "day_of_week must be between 0 (Sun) and 6 (Sat)" };
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
      return { valid: false, error: "Time must be in HH:MM 24h format" };
    }

    if (slot.start_time >= slot.end_time) {
      return { valid: false, error: "start_time must be strictly earlier than end_time" };
    }

    return { valid: true };
  };

  // Valid standard weekday slot
  assert.equal(
    validateAvailabilitySlot({ day_of_week: 1, start_time: "09:00", end_time: "17:00" }).valid,
    true
  );

  // Inverted times (end before start)
  const inverted = validateAvailabilitySlot({
    day_of_week: 2,
    start_time: "16:00",
    end_time: "10:00",
  });
  assert.equal(inverted.valid, false);
  assert.equal(inverted.error, "start_time must be strictly earlier than end_time");

  // Equal start and end
  const zeroDuration = validateAvailabilitySlot({
    day_of_week: 3,
    start_time: "12:00",
    end_time: "12:00",
  });
  assert.equal(zeroDuration.valid, false);

  // Invalid day of week
  const badDay = validateAvailabilitySlot({
    day_of_week: 7,
    start_time: "09:00",
    end_time: "17:00",
  });
  assert.equal(badDay.valid, false);
});

test("Storage validation enforces allowed image types and size boundaries", () => {
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const validateUpload = (file) => {
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "File exceeds 5MB limit" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { ok: false, error: "Disallowed MIME type" };
    }
    return { ok: true };
  };

  // Valid image
  assert.equal(validateUpload({ size: 1024 * 100, type: "image/jpeg" }).ok, true);
  assert.equal(validateUpload({ size: 1024 * 500, type: "image/webp" }).ok, true);

  // Oversized image
  assert.equal(validateUpload({ size: 6 * 1024 * 1024, type: "image/png" }).ok, false);

  // Disallowed executable / document MIME
  assert.equal(validateUpload({ size: 1024, type: "application/pdf" }).ok, false);
  assert.equal(validateUpload({ size: 1024, type: "text/html" }).ok, false);
});

test("Resource authorization enforces ownership boundary on updates and archives", () => {
  const canModifyResource = ({ currentUserId, resourceOwnerId }) => {
    if (!currentUserId) return false;
    return currentUserId === resourceOwnerId;
  };

  const ownerId = "custodian-101";
  const attackerId = "user-202";

  // Owner can modify
  assert.equal(canModifyResource({ currentUserId: ownerId, resourceOwnerId: ownerId }), true);

  // Non-owner cannot modify
  assert.equal(canModifyResource({ currentUserId: attackerId, resourceOwnerId: ownerId }), false);

  // Anonymous visitor cannot modify
  assert.equal(canModifyResource({ currentUserId: null, resourceOwnerId: ownerId }), false);
});
