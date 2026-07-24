import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

export const CampaignFundingPools: CollectionConfig = {
  slug: "campaign-funding-pools",
  admin: {
    hidden: true,
    useAsTitle: "internalLabel",
  },
  access: {
    read: anyone,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  timestamps: true,
  fields: [
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true, index: true },
    { name: "internalLabel", type: "text", required: true },
    { name: "currency", type: "select", options: ["TRY", "USD", "EUR", "GBP"], required: true },
    { name: "targetAmount", type: "number", required: true, min: 0 },
    { name: "collectedAmount", type: "number", defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "donorCount", type: "number", defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "reportingMode", type: "select", defaultValue: "pool", options: ["pool", "donation_based"] },
    { name: "isDonationOpen", type: "checkbox", defaultValue: true },
    { name: "availableLocales", type: "json", required: true, defaultValue: ["tr"], admin: { hidden: true } },
    { name: "title", type: "text", required: true, localized: true },
    { name: "description", type: "richText", localized: true },
    { name: "category", type: "relationship", relationTo: "categories", localized: true },
    { name: "coverImageAlt", type: "text", localized: true },
  ],
};
