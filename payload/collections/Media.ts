import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";
import { normalizeMediaUpload } from "@/lib/security/media-upload";

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
    beforeOperation: [async ({ operation, req }) => {
      if ((operation === "create" || operation === "update") && req.file) {
        req.file = await normalizeMediaUpload(req.file);
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
