import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniPriceRevisions: CollectionConfig = {
  slug: "qurbani-price-revisions",
  admin: { useAsTitle: "revision", group: "Kurban Stok", defaultColumns: ["product", "batchLine", "revision", "unitPrice", "currency", "status", "effectiveFrom"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "product", type: "relationship", relationTo: "qurbani-products", required: true, index: true },
    { name: "batchLine", type: "relationship", relationTo: "qurbani-stock-batch-lines", index: true },
    { name: "revision", type: "number", required: true, min: 1 },
    { name: "unitPrice", type: "number", required: true, min: 0 },
    { name: "currency", type: "select", required: true, options: ["TRY", "USD", "EUR", "GBP"] },
    { name: "status", type: "select", required: true, defaultValue: "active", index: true, options: ["scheduled", "active", "retired"] },
    { name: "effectiveFrom", type: "date", required: true },
    { name: "effectiveTo", type: "date" },
    { name: "createdBy", type: "relationship", relationTo: "users" },
    { name: "reason", type: "textarea" },
    { name: "isLegacy", type: "checkbox", required: true, defaultValue: false },
  ],
};
