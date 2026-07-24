import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniShares: CollectionConfig = {
  slug: "qurbani-shares",
  admin: { useAsTitle: "ownerName", group: "Kurban", defaultColumns: ["ownerName", "ownerPhone", "order", "pool", "sequence", "status"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "order", type: "relationship", relationTo: "qurbani-orders", required: true, index: true },
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "ownerName", type: "text", required: true },
    { name: "ownerPhone", type: "text" },
    { name: "effectivePhone", type: "text", required: true },
    { name: "sequence", type: "number", required: true, min: 1, max: 7 },
    { name: "status", type: "select", required: true, defaultValue: "reserved", options: ["reserved", "confirmed", "cancelled", "action_required"], index: true },
    { name: "confirmedAt", type: "date" },
  ],
};
