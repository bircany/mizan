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
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    adminThumbnail: "thumbnail",
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 300,
      },
    ],
  },
  hooks: {
    beforeOperation: [({ operation, req }) => {
      if ((operation === "create" || operation === "update") && req.file && req.file.size > 10 * 1024 * 1024) {
        throw new Error("Görsel en fazla 10 MB olabilir.");
      }
    }],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
};
