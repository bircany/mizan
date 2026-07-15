import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "Icerik",
    defaultColumns: ["title", "slug", "published", "updatedAt"],
  },
  access: {
    read: anyone,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  timestamps: true,
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "content",
      type: "richText",
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
};
