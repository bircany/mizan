import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const Donations: CollectionConfig = {
  slug: "donations",
  admin: {
    useAsTitle: "receiptNumber",
    group: "Operasyon",
    defaultColumns: ["receiptNumber", "donorName", "grossAmount", "status", "campaign", "createdAt"],
    listSearchableFields: ["donorName", "email", "receiptNumber", "paymentId"],
  },
  access: {
    read: financeOnly,
    // Donations are created and transitioned only by the verified payment service.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "donorName", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "phone", type: "text" },
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "fundingPool", type: "relationship", relationTo: "campaign-funding-pools", required: false, index: true },
    { name: "qurbaniOrder", type: "relationship", relationTo: "qurbani-orders", required: false, index: true },
    { name: "qurbaniCheckout", type: "relationship", relationTo: "qurbani-checkouts", required: false, index: true },
    { name: "grossAmount", type: "number", required: true, min: 1 },
    { name: "netConfirmedAmount", type: "number", required: true, min: 0 },
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
      options: ["paid", "pending_review", "failed", "cancelled", "partially_refunded", "refunded"],
      defaultValue: "pending_review",
      required: true,
    },
    { name: "paymentId", type: "text", required: true, unique: true, index: true },
    { name: "receiptNumber", type: "text", required: true, unique: true },
    { name: "paymentSession", type: "relationship", relationTo: "payment-sessions", required: true },
    { name: "taxReceiptRequested", type: "checkbox", defaultValue: false },
    { name: "donationNote", type: "textarea" },
    { name: "receiptPath", type: "text" },
  ],
};
