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
    { name: "address", type: "textarea" },
    { name: "city", type: "text" },
    { name: "countryCode", type: "text" },
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "quantity", type: "number", required: true, min: 1, defaultValue: 1 },
    { name: "unitPriceSnapshot", type: "number", min: 1 },
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
      options: [
        "draft",
        "reserved",
        "payment_initialized",
        "awaiting_bank_transfer",
        "bank_transfer_submitted",
        "callback_received",
        "completed",
        "failed",
        "expired",
        "cancelled",
      ],
      defaultValue: "draft",
    },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      defaultValue: "card",
      options: [
        { label: "Kart", value: "card" },
        { label: "EFT / Havale", value: "bank_transfer" },
      ],
    },
    { name: "reservationExpiresAt", type: "date", index: true },
    { name: "note", type: "textarea" },
    { name: "taxReceiptRequested", type: "checkbox", defaultValue: false },
    { name: "kvkkAcceptedAt", type: "date" },
    { name: "termsAcceptedAt", type: "date" },
    { name: "source", type: "text", defaultValue: "website" },
  ],
};
