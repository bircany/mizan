import type { CollectionConfig } from "payload";
import { superAdminsOnly } from "@/payload/access";

export const QurbaniCountries: CollectionConfig = {
  slug: "qurbani-countries",
  admin: { useAsTitle: "name", group: "Kurban Stok", defaultColumns: ["name", "isoCode", "isActive", "sortOrder"] },
  access: { read: superAdminsOnly, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "isoCode", type: "text", required: true, unique: true, index: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "name", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", localized: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "isActive", type: "checkbox", required: true, defaultValue: true, index: true },
    { name: "sortOrder", type: "number", required: true, defaultValue: 0 },
  ],
};
