import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

/** One configuration record for the Ahmet support widget on the home page. */
export const ChildDonationSettings: CollectionConfig = {
  slug: "child-donation-settings",
  admin: { hidden: true },
  access: { read: anyone, create: superAdminsOnly, update: superAdminsOnly, delete: () => false },
  timestamps: true,
  fields: [
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "usdCampaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "eurCampaign", type: "relationship", relationTo: "campaigns", required: true },
    { name: "foodPrice", type: "number", required: true, min: 1 },
    { name: "stationeryPrice", type: "number", required: true, min: 1 },
    { name: "toyPrice", type: "number", required: true, min: 1 },
    { name: "clothingPrice", type: "number", required: true, min: 1 },
    { name: "foodUsdPrice", type: "number", required: true, min: 0.01 },
    { name: "stationeryUsdPrice", type: "number", required: true, min: 0.01 },
    { name: "toyUsdPrice", type: "number", required: true, min: 0.01 },
    { name: "clothingUsdPrice", type: "number", required: true, min: 0.01 },
    { name: "foodEurPrice", type: "number", required: true, min: 0.01 },
    { name: "stationeryEurPrice", type: "number", required: true, min: 0.01 },
    { name: "toyEurPrice", type: "number", required: true, min: 0.01 },
    { name: "clothingEurPrice", type: "number", required: true, min: 0.01 },
  ],
};
