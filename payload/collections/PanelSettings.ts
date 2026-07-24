import type { CollectionConfig } from "payload";

import { internalTeam, superAdminsOnly } from "@/payload/access";

/**
 * A deliberately single-row collection. The database migration enforces id=1;
 * the custom panel UI is the only place where this record is edited.
 */
export const PanelSettings: CollectionConfig = {
  slug: "panel-settings",
  admin: { hidden: true },
  access: {
    read: internalTeam,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    {
      name: "quickLinks",
      type: "json",
      required: true,
      defaultValue: [],
    },
  ],
};
