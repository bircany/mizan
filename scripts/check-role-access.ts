import assert from "node:assert/strict";

import { canAccessPanelRoute, canAccessPayloadApi, PANEL_ROUTE_ACCESS } from "../lib/auth/panel-access";
import { USER_ROLES } from "../lib/auth/roles";

for (const role of USER_ROLES) {
  assert.equal(canAccessPanelRoute(role, "dashboard"), true, `${role} dashboard access`);
}

for (const route of Object.keys(PANEL_ROUTE_ACCESS) as Array<keyof typeof PANEL_ROUTE_ACCESS>) {
  assert.equal(canAccessPanelRoute("super_admin", route), true, `super_admin ${route} access`);
}

assert.equal(canAccessPanelRoute("finance", "payments"), true);
assert.equal(canAccessPanelRoute("finance", "fulfillments"), true);
assert.equal(canAccessPanelRoute("finance", "fieldTasks"), false);
assert.equal(canAccessPanelRoute("approver", "reports"), true);
assert.equal(canAccessPanelRoute("approver", "fieldSubmissions"), true);
assert.equal(canAccessPanelRoute("approver", "donations"), false);
assert.equal(canAccessPanelRoute("field_operator", "fieldTasks"), true);
assert.equal(canAccessPanelRoute("field_operator", "fieldSubmissions"), true);
assert.equal(canAccessPanelRoute("field_operator", "refunds"), false);
assert.equal(canAccessPanelRoute("finance", "contentNews"), false);
assert.equal(canAccessPanelRoute("approver", "users"), false);

assert.equal(canAccessPayloadApi("super_admin"), true);
assert.equal(canAccessPayloadApi("finance"), false);
assert.equal(canAccessPayloadApi("approver"), false);
assert.equal(canAccessPayloadApi("field_operator"), false);

console.log("Role access matrix passed.");
