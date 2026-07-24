import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniSeasons: CollectionConfig = {
  slug: "qurbani-seasons",
  admin: {
    useAsTitle: "year",
    group: "Kurban",
    defaultColumns: ["year", "status", "salesStartAt", "salesEndAt", "eidAt"],
  },
  access: {
    read: superAdminsOnly,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  timestamps: true,
  fields: [
    { name: "year", type: "number", required: true, unique: true, index: true, min: 2020, max: 2200 },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: ["draft", "active", "sales_closed", "completed", "archived"],
      index: true,
    },
    { name: "salesStartAt", type: "date", required: true },
    { name: "salesEndAt", type: "date", required: true },
    { name: "eidAt", type: "date", required: true },
    { name: "codeCounter", type: "number", required: true, defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "availableLocales", type: "json", required: true, defaultValue: ["tr"] },
    { name: "heroTitle", type: "text", required: true, localized: true },
    { name: "heroDescription", type: "textarea", localized: true },
    { name: "pageContent", type: "textarea", localized: true },
    { name: "processSteps", type: "json", localized: true, defaultValue: [] },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "bankName", type: "text" },
    { name: "accountHolder", type: "text" },
    { name: "iban", type: "text" },
    { name: "bankBranch", type: "text" },
    { name: "eftDescription", type: "textarea", localized: true },
    { name: "proxyTextVersion", type: "text", required: true, defaultValue: "1.0" },
    { name: "proxyText", type: "textarea", required: true, localized: true },
  ],
};
