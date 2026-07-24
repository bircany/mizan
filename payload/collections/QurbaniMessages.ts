import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniMessages: CollectionConfig = {
  slug: "qurbani-messages",
  admin: { useAsTitle: "idempotencyKey", group: "Kurban", defaultColumns: ["channel", "recipientPhone", "pool", "status", "sentAt", "updatedAt"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "accessLink", type: "relationship", relationTo: "qurbani-access-links", required: true, index: true },
    { name: "channel", type: "select", required: true, defaultValue: "whatsapp", options: ["whatsapp", "sms"] },
    { name: "recipientPhone", type: "text", required: true },
    { name: "recipientPhoneHash", type: "text", required: true, index: true },
    { name: "shareSummary", type: "json", required: true },
    { name: "body", type: "textarea", required: true },
    { name: "idempotencyKey", type: "text", required: true, unique: true, index: true },
    { name: "status", type: "select", required: true, defaultValue: "queued", index: true, options: ["queued", "paused", "sending", "sent", "delivered", "read", "failed", "cancelled"] },
    { name: "dispatchBatchId", type: "text", index: true },
    { name: "scheduledAt", type: "date", index: true },
    { name: "providerMessageId", type: "text", index: true },
    { name: "attemptCount", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "lastError", type: "textarea" },
    { name: "sentAt", type: "date" },
    { name: "deliveredAt", type: "date" },
    { name: "readAt", type: "date" },
  ],
};
