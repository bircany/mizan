import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniCheckouts: CollectionConfig = {
  slug: "qurbani-checkouts",
  admin: { useAsTitle: "publicId", group: "Kurban Stok", defaultColumns: ["publicId", "buyerMask", "totalAmount", "currency", "status", "expiresAt"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "publicId", type: "text", required: true, unique: true, index: true },
    { name: "buyerMask", type: "text" },
    { name: "buyerHash", type: "text", index: true },
    { name: "encryptedPayload", type: "textarea" },
    { name: "encryptionIv", type: "text" },
    { name: "encryptionTag", type: "text" },
    { name: "encryptionKeyVersion", type: "text" },
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true, index: true },
    { name: "fundingPool", type: "relationship", relationTo: "campaign-funding-pools", required: true, index: true },
    { name: "totalAmount", type: "number", required: true, min: 0 },
    { name: "currency", type: "select", required: true, options: ["TRY", "USD", "EUR", "GBP"] },
    { name: "status", type: "select", required: true, defaultValue: "held", index: true, options: ["created", "held", "payment_initialized", "payment_received_processing", "succeeded", "failed", "expired", "cancelled"] },
    { name: "source", type: "select", required: true, defaultValue: "website", options: ["website", "manual"] },
    { name: "providerConversationId", type: "text", index: true },
    { name: "providerPaymentId", type: "text", index: true },
    { name: "donationIntent", type: "relationship", relationTo: "donation-intents", index: true },
    { name: "donation", type: "relationship", relationTo: "donations", index: true },
    { name: "expiresAt", type: "date", required: true, index: true },
    { name: "finalizedAt", type: "date" },
    { name: "ipAddress", type: "text" },
    { name: "failureCode", type: "text" },
    { name: "piiPurgeAt", type: "date", required: true, index: true },
    { name: "piiPurgedAt", type: "date" },
  ],
};
