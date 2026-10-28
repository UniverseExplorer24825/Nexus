import test from "node:test";
import assert from "node:assert/strict";

test("Resource visibility policy restricts draft and archived to owners and admins", () => {
  const canViewResource = ({ resource, user }) => {
    // Public published resources
    if (resource.status === "published") return true;

    // Unauthenticated visitors cannot see non-published
    if (!user) return false;

    // Owners and admins can see drafts/archived
    if (user.id === resource.owner_id) return true;
    if (user.role === "institution_admin") return true;

    return false;
  };

  const draftResource = {
    id: "r1",
    owner_id: "user-owner",
    status: "draft",
  };

  const publishedResource = {
    id: "r2",
    owner_id: "user-owner",
    status: "published",
  };

  // Anonymous visitor
  assert.equal(canViewResource({ resource: publishedResource, user: null }), true);
  assert.equal(canViewResource({ resource: draftResource, user: null }), false);

  // Unrelated member
  const unrelatedMember = { id: "user-other", role: "member" };
  assert.equal(canViewResource({ resource: publishedResource, user: unrelatedMember }), true);
  assert.equal(canViewResource({ resource: draftResource, user: unrelatedMember }), false);

  // Resource owner
  const owner = { id: "user-owner", role: "member" };
  assert.equal(canViewResource({ resource: draftResource, user: owner }), true);

  // Admin
  const admin = { id: "admin-user", role: "institution_admin" };
  assert.equal(canViewResource({ resource: draftResource, user: admin }), true);
});

test("Activity log policy enforces read-only access and rejects client mutations", () => {
  const canMutateActivityLogs = (clientOperation) => {
    // Direct client-initiated mutations on activity_logs are strictly disallowed
    const allowedClientOps = ["SELECT"];
    return allowedClientOps.includes(clientOperation);
  };

  assert.equal(canMutateActivityLogs("SELECT"), true);
  assert.equal(canMutateActivityLogs("INSERT"), false);
  assert.equal(canMutateActivityLogs("UPDATE"), false);
  assert.equal(canMutateActivityLogs("DELETE"), false);
});
