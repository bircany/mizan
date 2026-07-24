import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const Campaigns: CollectionConfig = {
  slug: "campaigns",
  admin: {
    useAsTitle: "title",
    group: "Icerik",
    defaultColumns: ["title", "targetAmount", "collectedAmount", "isDonationOpen", "category"],
    listSearchableFields: ["title", "description"],
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
      name: "description",
      type: "richText",
      localized: true,
    },
    {
      name: "targetAmount",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "collectedAmount",
      type: "number",
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: "coverImagePath",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: "coverImageAlt",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (typeof value === "string" && value.trim()) return value;
            if (data?.title) {
              const title = typeof data.title === "string" ? data.title : data.title?.tr;
              return slugify(String(title || "bagis-alani")) || "bagis-alani";
            }

            return value;
          },
        ],
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
    },
    {
      name: "currency",
      type: "select",
      options: ["TRY", "USD", "EUR", "GBP"],
      defaultValue: "TRY",
    },
    {
      name: "reportingMode",
      type: "select",
      defaultValue: "pool",
      options: [
        {
          label: "Havuz",
          value: "pool",
        },
        {
          label: "Bagis Bazli",
          value: "donation_based",
        },
      ],
    },
    {
      name: "isDonationOpen",
      type: "checkbox",
      defaultValue: true,
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
          ({ data, value }) => {
            if (typeof value === "string" && value.trim()) return value;
            if (data?.title) {
              const title = typeof data.title === "string" ? data.title : data.title?.tr;
              return slugify(String(title || "bagis-alani")) || "bagis-alani";
            }

            return value;
          },
        ],
      },
    },
    {
      name: "donorCount",
      type: "number",
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
  ],
};
