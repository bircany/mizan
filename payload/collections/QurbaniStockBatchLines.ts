import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniStockBatchLines: CollectionConfig = {
  slug: "qurbani-stock-batch-lines",
  admin: { useAsTitle: "id", group: "Kurban Stok", defaultColumns: ["batch", "product", "kind", "animalCount", "capacity", "totalQuantity", "status"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "batch", type: "relationship", relationTo: "qurbani-stock-batches", required: true, index: true },
    { name: "product", type: "relationship", relationTo: "qurbani-products", required: true, index: true },
    { name: "kind", type: "select", required: true, options: ["cattle", "small_livestock"] },
    { name: "animalCount", type: "number", required: true, min: 0 },
    { name: "capacity", type: "number", required: true, min: 1, max: 7 },
    { name: "totalQuantity", type: "number", required: true, min: 0 },
    { name: "priceRevision", type: "relationship", relationTo: "qurbani-price-revisions", index: true },
    { name: "status", type: "select", required: true, defaultValue: "draft", index: true, options: ["draft", "active", "depleted", "closed", "cancelled"] },
    { name: "salesStartAt", type: "date" },
    { name: "salesEndAt", type: "date" },
    { name: "sortOrder", type: "number", required: true, defaultValue: 0 },
  ],
};
