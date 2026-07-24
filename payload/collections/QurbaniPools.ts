import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniPools: CollectionConfig = {
  slug: "qurbani-pools",
  admin: { useAsTitle: "code", group: "Kurban", defaultColumns: ["code", "product", "capacity", "reservedCount", "confirmedCount", "status", "fieldTask"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "season", type: "relationship", relationTo: "qurbani-seasons", required: true, index: true },
    { name: "product", type: "relationship", relationTo: "qurbani-products", required: true, index: true },
    { name: "country", type: "relationship", relationTo: "qurbani-countries", index: true },
    { name: "stockBatchLine", type: "relationship", relationTo: "qurbani-stock-batch-lines", index: true },
    { name: "priceRevision", type: "relationship", relationTo: "qurbani-price-revisions", index: true },
    { name: "ordinal", type: "number", min: 1 },
    { name: "code", type: "text", index: true },
    { name: "capacity", type: "number", required: true, min: 1, max: 7 },
    { name: "reservedCount", type: "number", required: true, defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "confirmedCount", type: "number", required: true, defaultValue: 0, min: 0, admin: { readOnly: true } },
    {
      name: "status", type: "select", required: true, defaultValue: "open", index: true,
      options: ["open", "full", "assigned", "in_progress", "video_processing", "ready", "notified", "closed", "withdrawn"],
    },
    { name: "fieldTask", type: "relationship", relationTo: "field-tasks", index: true },
    { name: "fullAt", type: "date" },
    { name: "lockedAt", type: "date" },
    { name: "actionRequired", type: "checkbox", required: true, defaultValue: false, index: true },
    { name: "operationNotes", type: "textarea" },
    { name: "isLegacy", type: "checkbox", required: true, defaultValue: false },
  ],
};
