import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniDocuments: CollectionConfig = {
  slug: "qurbani-documents",
  admin: { useAsTitle: "title", group: "Kurban Stok", defaultColumns: ["title", "kind", "status", "stockBatch", "fileName"] },
  access: { read: superAdminsOnly, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "stockBatch", type: "relationship", relationTo: "qurbani-stock-batches", required: true, index: true },
    { name: "kind", type: "select", required: true, options: ["invoice", "veterinary", "contract", "slaughterhouse", "ear_tag_list", "transport", "other"] },
    { name: "title", type: "text", required: true },
    { name: "storageKey", type: "text", required: true, unique: true, index: true },
    { name: "fileName", type: "text", required: true },
    { name: "mimeType", type: "select", required: true, options: ["application/pdf", "image/jpeg", "image/png"] },
    { name: "sizeBytes", type: "number", required: true, min: 1, max: 26214400 },
    { name: "isPublic", type: "checkbox", required: true, defaultValue: false },
    { name: "status", type: "select", required: true, defaultValue: "active", options: ["active", "archived"] },
    { name: "archivedBy", type: "relationship", relationTo: "users" },
    { name: "archivedAt", type: "date" },
    { name: "archiveReason", type: "textarea" },
    { name: "notes", type: "textarea" },
  ],
};
