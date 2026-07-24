import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniRegions: CollectionConfig = {
  slug: "qurbani-regions",
  admin: { useAsTitle: "name", group: "Kurban Stok", defaultColumns: ["name", "country", "isActive", "sortOrder"] },
  access: { read: superAdminsOnly, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "season", type: "relationship", relationTo: "qurbani-seasons", required: true, index: true },
    { name: "country", type: "relationship", relationTo: "qurbani-countries", required: true, index: true },
    { name: "slug", type: "text", required: true, index: true },
    { name: "name", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", localized: true },
    { name: "publicContent", type: "textarea", localized: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "salesStartAt", type: "date", required: true },
    { name: "salesEndAt", type: "date", required: true },
    { name: "fieldPreparationAt", type: "date" },
    { name: "countdownAt", type: "date" },
    { name: "codeCounter", type: "number", required: true, defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "isActive", type: "checkbox", required: true, defaultValue: true, index: true },
    { name: "sortOrder", type: "number", required: true, defaultValue: 0 },
  ],
};
