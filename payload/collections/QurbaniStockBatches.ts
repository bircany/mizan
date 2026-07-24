import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniStockBatches: CollectionConfig = {
  slug: "qurbani-stock-batches",
  admin: { useAsTitle: "name", group: "Kurban Stok", defaultColumns: ["code", "name", "season", "country", "nature", "status", "availableCapacity"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "season", type: "relationship", relationTo: "qurbani-seasons", required: true, index: true },
    { name: "country", type: "relationship", relationTo: "qurbani-countries", required: true, index: true },
    { name: "region", type: "relationship", relationTo: "qurbani-regions", index: true },
    { name: "code", type: "text", required: true, unique: true, index: true },
    { name: "name", type: "text", required: true },
    { name: "nature", type: "select", required: true, options: ["planned", "secured"] },
    { name: "status", type: "select", required: true, defaultValue: "draft", index: true, options: ["draft", "active", "paused", "preparing", "transferred", "completed", "archived"] },
    { name: "idempotencyKey", type: "text", required: true, unique: true, index: true },
    { name: "animalCount", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "totalCapacity", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "availableCapacity", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "salesStartAt", type: "date" },
    { name: "salesEndAt", type: "date" },
    { name: "createdBy", type: "relationship", relationTo: "users" },
    { name: "notes", type: "textarea" },
    { name: "isLegacy", type: "checkbox", required: true, defaultValue: false },
  ],
};
