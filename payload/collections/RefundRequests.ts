import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const RefundRequests: CollectionConfig = {
  slug: "refund-requests",
  admin: {
    useAsTitle: "providerReference",
    group: "Finans",
    defaultColumns: ["type", "status", "amount", "providerReference", "requestedBy", "createdAt"],
  },
  access: {
    read: financeOnly,
    create: financeOnly,
    update: financeOnly,
    delete: financeOnly,
  },
  timestamps: true,
  fields: [
    { name: "donation", type: "relationship", relationTo: "donations", required: true },
    {
      name: "type",
      type: "select",
      options: ["cancel", "refund_full", "refund_partial"],
      required: true,
    },
    {
      name: "reason",
      type: "select",
      required: true,
      options: ["technical_error", "wrong_transaction", "legal_obligation"],
    },
    { name: "description", type: "textarea", required: true },
    { name: "evidenceBucket", type: "text", required: true },
    { name: "evidencePath", type: "text", required: true },
    { name: "evidenceMimeType", type: "text", required: true },
    { name: "manualReviewRequired", type: "checkbox", defaultValue: false },
    { name: "amount", type: "number", min: 0 },
    { name: "providerReference", type: "text" },
    { name: "providerResponse", type: "json" },
    {
      name: "status",
      type: "select",
      options: ["pending", "completed", "failed"],
      defaultValue: "pending",
    },
    { name: "requestedBy", type: "relationship", relationTo: "users", required: true },
  ],
};
