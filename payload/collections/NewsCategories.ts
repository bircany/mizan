import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const NewsCategories: CollectionConfig = {
  slug: "news-categories",
  admin: {
    useAsTitle: "name",
    group: "Icerik",
    defaultColumns: ["name", "isActive", "sortOrder", "slug"],
  },
  access: {
    read: anyone,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  timestamps: true,
  fields: [
    { name: "name", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", localized: true, defaultValue: "" },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "sortOrder", type: "number", defaultValue: 0, min: 0, admin: { position: "sidebar" } },
    { name: "isActive", type: "checkbox", defaultValue: true, admin: { position: "sidebar" } },
  ],
};
