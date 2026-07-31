import assert from "node:assert/strict";

import { canAccessPanelRoute, canAccessPayloadApi, PANEL_ROUTE_ACCESS } from "../lib/auth/panel-access";
import { USER_ROLES } from "../lib/auth/roles";

for (const role of USER_ROLES) {
  assert.equal(canAccessPanelRoute(role, "dashboard"), true, `${role} dashboard access`);
}

for (const route of Object.keys(PANEL_ROUTE_ACCESS) as Array<keyof typeof PANEL_ROUTE_ACCESS>) {
  assert.equal(canAccessPanelRoute("admin", route), true, `admin ${route} access`);
}

assert.equal(canAccessPanelRoute("field_operator", "fieldTasks"), true);
assert.equal(canAccessPanelRoute("field_operator", "fieldSubmissions"), true);
assert.equal(canAccessPanelRoute("field_operator", "refunds"), false);
assert.equal(canAccessPanelRoute("field_operator", "contentNews"), false);
assert.equal(canAccessPanelRoute("field_operator", "users"), false);
assert.equal(canAccessPanelRoute("field_operator", "whatsapp"), false);
assert.equal(canAccessPanelRoute("admin", "whatsapp"), true);

// Legacy database/session values are accepted only during the cutover window
// and normalize to the new admin role.
assert.equal(canAccessPayloadApi("super_admin"), true);
assert.equal(canAccessPayloadApi("finance"), true);
assert.equal(canAccessPayloadApi("approver"), true);
assert.equal(canAccessPayloadApi("admin"), true);
assert.equal(canAccessPayloadApi("field_operator"), false);

console.log("Role access matrix passed.");
