import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const PaymentSessions: CollectionConfig = {
  slug: "payment-sessions",
  admin: {
    useAsTitle: "conversationId",
    group: "Odeme",
    defaultColumns: ["conversationId", "providerStatus", "fraudStatus", "paymentId", "createdAt"],
  },
  access: {
    read: financeOnly,
    // Checkout tokens and provider responses are payment-service-only data.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "donationIntent", type: "relationship", relationTo: "donation-intents", required: true },
    { name: "conversationId", type: "text", required: true, unique: true, index: true },
    {
      name: "paymentMethod",
      type: "select",
      options: ["card", "bank_transfer"],
      defaultValue: "card",
      required: true,
    },
    { name: "reservationExpiresAt", type: "date", index: true },
    { name: "checkoutToken", type: "text", unique: true, index: true },
    { name: "checkoutFormContent", type: "textarea" },
    { name: "paymentPageUrl", type: "text" },
    { name: "providerStatus", type: "text", defaultValue: "INIT" },
    { name: "fraudStatus", type: "number" },
    { name: "paymentId", type: "text", index: true },
    { name: "lastFourDigits", type: "text" },
    { name: "cardAssociation", type: "text" },
    { name: "eftProofBucket", type: "text" },
    { name: "eftProofPath", type: "text" },
    {
      name: "eftReviewStatus",
      type: "select",
      options: ["pending", "approved", "rejected"],
    },
    { name: "eftReviewedAt", type: "date" },
    { name: "eftReviewedBy", type: "relationship", relationTo: "users" },
    { name: "rawResponse", type: "json" },
  ],
};
