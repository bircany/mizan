import type { CollectionConfig } from "payload";

import { fieldOperatorOrAdmin } from "@/payload/access";

export const OperationGroupMembers: CollectionConfig = {
  slug: "operation-group-members",
  admin: {
    useAsTitle: "memberKey",
    group: "Video Teslimat",
    defaultColumns: ["memberKey", "group", "donationIntent", "donation", "status"],
  },
  access: {
    read: fieldOperatorOrAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "group", type: "relationship", relationTo: "operation-groups", required: true, index: true },
    { name: "donationIntent", type: "relationship", relationTo: "donation-intents", required: true, index: true },
    { name: "donation", type: "relationship", relationTo: "donations", index: true },
    { name: "participant", type: "relationship", relationTo: "donation-participants", index: true },
    { name: "memberKey", type: "text", required: true, unique: true, index: true },
    { name: "unitIndex", type: "number", required: true, min: 1 },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "reserved",
      index: true,
      options: ["reserved", "confirmed", "released", "refunded", "action_required"],
    },
    { name: "reservationExpiresAt", type: "date", required: true, index: true },
    { name: "confirmedAt", type: "date" },
  ],
};
