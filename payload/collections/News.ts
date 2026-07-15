import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const News: CollectionConfig = {
  slug: "news",
  admin: {
    useAsTitle: "title",
    group: "Icerik",
    defaultColumns: ["title", "category", "publishedAt", "author"],
    listSearchableFields: ["title", "content"],
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
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "category",
      type: "select",
      options: [
        { label: "Haber", value: "haber" },
        { label: "Etkinlik", value: "etkinlik" },
        { label: "Duyuru", value: "duyuru" },
        { label: "Proje", value: "proje" },
      ],
      defaultValue: "haber",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
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
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (!data?.slug && data?.title) {
              const title = typeof data.title === "string" ? data.title : data.title?.tr;
              return title
                ?.toLowerCase()
                .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-");
            }

            return data?.slug;
          },
        ],
      },
    },
    {
      name: "author",
      type: "text",
      admin: {
        position: "sidebar",
      },
    },
  ],
};
