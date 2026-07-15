import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const PaymentEvents: CollectionConfig = {
  slug: "payment-events",
  admin: {
    useAsTitle: "eventType",
    group: "Odeme",
    defaultColumns: ["eventType", "referenceId", "signatureVerified", "processedAt", "createdAt"],
  },
  access: {
    read: financeOnly,
    // Provider events are append-only records written by the payment service.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "eventType", type: "text", required: true },
    { name: "referenceId", type: "text", required: true, index: true },
    { name: "headers", type: "json" },
    { name: "payload", type: "json", required: true },
    { name: "signatureVerified", type: "checkbox", defaultValue: false },
    { name: "processedAt", type: "date" },
    { name: "paymentSession", type: "relationship", relationTo: "payment-sessions" },
  ],
};
