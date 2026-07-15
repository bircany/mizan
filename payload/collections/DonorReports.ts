import type { CollectionConfig } from "payload";

import { approverOrAdmin } from "@/payload/access";

export const DonorReports: CollectionConfig = {
  slug: "donor-reports",
  admin: {
    useAsTitle: "title",
    group: "Operasyon",
    defaultColumns: ["title", "status", "donation", "approvedBy", "sentAt"],
  },
  access: {
    read: approverOrAdmin,
    create: approverOrAdmin,
    update: approverOrAdmin,
    delete: approverOrAdmin,
  },
  timestamps: true,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "donation", type: "relationship", relationTo: "donations", required: true },
    { name: "proofSubmissions", type: "relationship", relationTo: "proof-submissions", hasMany: true },
    { name: "summaryForDonor", type: "textarea" },
    {
      name: "status",
      type: "select",
      options: ["draft", "approved", "sent", "stopped"],
      defaultValue: "draft",
    },
    { name: "approvedBy", type: "relationship", relationTo: "users" },
    { name: "sentAt", type: "date" },
    { name: "sentEmailTo", type: "email" },
  ],
};
