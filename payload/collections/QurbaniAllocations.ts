import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniAllocations: CollectionConfig = {
  slug: "qurbani-allocations",
  admin: { useAsTitle: "idempotencyKey", group: "Kurban Stok", defaultColumns: ["checkout", "order", "pool", "quantity", "status"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "checkout", type: "relationship", relationTo: "qurbani-checkouts", required: true, index: true },
    { name: "checkoutLine", type: "relationship", relationTo: "qurbani-checkout-lines", required: true, index: true },
    { name: "order", type: "relationship", relationTo: "qurbani-orders", required: true, index: true },
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "hold", type: "relationship", relationTo: "qurbani-inventory-holds", required: true, index: true },
    { name: "priceRevision", type: "relationship", relationTo: "qurbani-price-revisions", required: true, index: true },
    { name: "quantity", type: "number", required: true, min: 1 },
    { name: "status", type: "select", required: true, defaultValue: "confirmed", options: ["confirmed", "released", "action_required"] },
    { name: "providerPaymentId", type: "text", required: true, index: true },
    { name: "idempotencyKey", type: "text", required: true, unique: true, index: true },
  ],
};
