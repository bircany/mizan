import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniCheckoutLines: CollectionConfig = {
  slug: "qurbani-checkout-lines",
  admin: { useAsTitle: "id", group: "Kurban Stok", defaultColumns: ["checkout", "product", "quantity", "unitPrice", "totalAmount", "status", "order"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "checkout", type: "relationship", relationTo: "qurbani-checkouts", required: true, index: true },
    { name: "product", type: "relationship", relationTo: "qurbani-products", required: true, index: true },
    { name: "stockBatchLine", type: "relationship", relationTo: "qurbani-stock-batch-lines", required: true, index: true },
    { name: "priceRevision", type: "relationship", relationTo: "qurbani-price-revisions", required: true, index: true },
    { name: "quantity", type: "number", required: true, min: 1 },
    { name: "participantCount", type: "number", required: true, min: 1 },
    { name: "encryptedItemIndex", type: "number", required: true, min: 0 },
    { name: "unitPrice", type: "number", required: true, min: 0 },
    { name: "totalAmount", type: "number", required: true, min: 0 },
    { name: "currency", type: "select", required: true, options: ["TRY", "USD", "EUR", "GBP"] },
    { name: "status", type: "select", required: true, defaultValue: "held", index: true, options: ["held", "finalized", "released", "expired"] },
    { name: "order", type: "relationship", relationTo: "qurbani-orders", index: true },
  ],
};
