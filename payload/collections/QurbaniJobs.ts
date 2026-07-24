import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniJobs: CollectionConfig = {
  slug: "qurbani-jobs",
  admin: { useAsTitle: "type", group: "Kurban", defaultColumns: ["type", "status", "attemptCount", "runAt", "lockedAt", "updatedAt"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "type", type: "select", required: true, index: true, options: ["expire_reservations", "process_video", "purge_storage", "send_whatsapp"] },
    { name: "status", type: "select", required: true, defaultValue: "queued", index: true, options: ["queued", "paused", "processing", "completed", "failed", "dead", "cancelled"] },
    { name: "order", type: "relationship", relationTo: "qurbani-orders", index: true },
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", index: true },
    { name: "video", type: "relationship", relationTo: "qurbani-videos", index: true },
    { name: "message", type: "relationship", relationTo: "qurbani-messages", index: true },
    { name: "payload", type: "json" },
    { name: "idempotencyKey", type: "text", unique: true, index: true },
    { name: "runAt", type: "date", required: true, defaultValue: () => new Date(), index: true },
    { name: "lockedAt", type: "date" },
    { name: "lockedBy", type: "text" },
    { name: "attemptCount", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "maxAttempts", type: "number", required: true, defaultValue: 5, min: 1 },
    { name: "lastError", type: "textarea" },
    { name: "completedAt", type: "date" },
  ],
};
