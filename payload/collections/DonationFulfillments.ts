import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const DonationFulfillments: CollectionConfig = {
  slug: "donation-fulfillments",
  admin: {
    useAsTitle: "donation",
    group: "Finans",
    defaultColumns: ["donation", "status", "receiptStatus", "emailStatus", "attemptCount", "updatedAt"],
  },
  access: {
    read: financeOnly,
    // Fulfillment state is changed only by trusted payment and retry services.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "donation", type: "relationship", relationTo: "donations", required: true, unique: true },
    {
      name: "status",
      type: "select",
      options: ["pending", "processing", "completed", "action_required"],
      defaultValue: "pending",
      required: true,
    },
    {
      name: "receiptStatus",
      type: "select",
      options: ["pending", "stored", "failed", "not_requested"],
      defaultValue: "pending",
      required: true,
    },
    {
      name: "reportStatus",
      type: "select",
      options: ["pending", "created", "failed"],
      defaultValue: "pending",
      required: true,
    },
    {
      name: "emailStatus",
      type: "select",
      options: ["pending", "sent", "failed", "skipped"],
      defaultValue: "pending",
      required: true,
    },
    { name: "attemptCount", type: "number", defaultValue: 0, min: 0, required: true },
    { name: "lastAttemptAt", type: "date" },
    { name: "lastError", type: "textarea" },
    { name: "emailMessageId", type: "text" },
  ],
};
