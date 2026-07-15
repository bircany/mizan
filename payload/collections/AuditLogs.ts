import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const AuditLogs: CollectionConfig = {
  slug: "audit-logs",
  admin: {
    useAsTitle: "action",
    group: "Sistem",
    defaultColumns: ["action", "actorEmail", "targetCollection", "createdAt"],
  },
  access: {
    read: financeOnly,
    // Audit records can only be appended from trusted server code.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "action", type: "text", required: true },
    { name: "actorEmail", type: "email" },
    { name: "targetCollection", type: "text" },
    { name: "targetId", type: "text" },
    { name: "details", type: "json" },
    { name: "ipAddress", type: "text" },
  ],
};
