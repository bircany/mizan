import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const DonationIntents: CollectionConfig = {
  slug: "donation-intents",
  admin: {
    useAsTitle: "conversationId",
    group: "Odeme",
    defaultColumns: ["conversationId", "donorName", "amount", "status", "campaign", "createdAt"],
  },
  access: {
    read: financeOnly,
    // Intent lifecycle is owned by the verified payment service.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "conversationId", type: "text", required: true, unique: true, index: true },
    { name: "donorName", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "phone", type: "text" },
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "amount", type: "number", required: true, min: 1 },
    {
      name: "currency",
      type: "select",
      options: ["TRY", "USD", "EUR", "GBP"],
      defaultValue: "TRY",
      required: true,
    },
    {
      name: "status",
      type: "select",
      options: ["draft", "payment_initialized", "callback_received", "completed", "failed"],
      defaultValue: "draft",
    },
    { name: "note", type: "textarea" },
    { name: "taxReceiptRequested", type: "checkbox", defaultValue: false },
    { name: "kvkkAcceptedAt", type: "date" },
    { name: "termsAcceptedAt", type: "date" },
    { name: "source", type: "text", defaultValue: "website" },
  ],
};
