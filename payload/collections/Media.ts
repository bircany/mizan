import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: anyone,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*"],
    adminThumbnail: "thumbnail",
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 300,
      },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
};
