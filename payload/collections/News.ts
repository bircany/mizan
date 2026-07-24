import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const News: CollectionConfig = {
  slug: "news",
  admin: {
    useAsTitle: "title",
    group: "Icerik",
    defaultColumns: ["title", "status", "newsCategory", "publishedAt"],
    listSearchableFields: ["title", "excerpt", "searchText"],
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
      admin: { hidden: true },
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
        hidden: true,
      },
    },
    {
      name: "newsCategory",
      type: "relationship",
      relationTo: "news-categories",
      admin: { position: "sidebar" },
    },
    {
      name: "availableLocales",
      type: "json",
      required: true,
      defaultValue: ["tr"],
      admin: { hidden: true },
    },
    { name: "excerpt", type: "textarea", localized: true },
    { name: "contentBlocks", type: "json", localized: true, defaultValue: [] },
    { name: "tags", type: "json", localized: true, defaultValue: [] },
    { name: "searchText", type: "textarea", localized: true, admin: { hidden: true, readOnly: true } },
    { name: "readTimeMinutes", type: "number", localized: true, defaultValue: 1, min: 1, admin: { hidden: true, readOnly: true } },
    { name: "coverImagePath", type: "text", admin: { hidden: true, readOnly: true } },
    { name: "coverImageAlt", type: "text", localized: true },
    {
      name: "relatedCampaigns",
      type: "relationship",
      relationTo: "campaigns",
      hasMany: true,
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Taslak", value: "draft" },
        { label: "Yayinda", value: "published" },
        { label: "Arsiv", value: "archived" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "featured", type: "checkbox", defaultValue: false, admin: { position: "sidebar" } },
    { name: "sortOrder", type: "number", defaultValue: 0, admin: { position: "sidebar" } },
    { name: "viewCount", type: "number", defaultValue: 0, min: 0, admin: { position: "sidebar", readOnly: true } },
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
