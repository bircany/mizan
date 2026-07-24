import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniInventoryHolds: CollectionConfig = {
  slug: "qurbani-inventory-holds",
  admin: { useAsTitle: "id", group: "Kurban Stok", defaultColumns: ["checkout", "checkoutLine", "pool", "quantity", "status", "expiresAt"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "checkout", type: "relationship", relationTo: "qurbani-checkouts", required: true, index: true },
    { name: "checkoutLine", type: "relationship", relationTo: "qurbani-checkout-lines", required: true, index: true },
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "priceRevision", type: "relationship", relationTo: "qurbani-price-revisions", required: true, index: true },
    { name: "quantity", type: "number", required: true, min: 1 },
    { name: "status", type: "select", required: true, defaultValue: "active", index: true, options: ["active", "consumed", "released", "expired"] },
    { name: "expiresAt", type: "date", required: true, index: true },
    { name: "consumedAt", type: "date" },
    { name: "releasedAt", type: "date" },
  ],
};
