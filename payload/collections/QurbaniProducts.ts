import type { CollectionBeforeValidateHook, CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

const enforceCapacity: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data;
  const animalType = data?.kind;
  const capacity = Number(data?.capacity || 0);
  if (animalType === "small_livestock") data.capacity = 1;
  if (animalType === "cattle" && (capacity < 1 || capacity > 7)) {
    throw new Error("Buyukbas havuz kapasitesi 1 ile 7 arasinda olmalidir.");
  }
  return data;
};

export const QurbaniProducts: CollectionConfig = {
  slug: "qurbani-products",
  admin: {
    useAsTitle: "title",
    group: "Kurban",
    defaultColumns: ["title", "season", "region", "kind", "price", "capacity", "isActive"],
  },
  access: { read: superAdminsOnly, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  hooks: { beforeValidate: [enforceCapacity] },
  fields: [
    { name: "season", type: "relationship", relationTo: "qurbani-seasons", required: true, index: true },
    { name: "country", type: "relationship", relationTo: "qurbani-countries", index: true },
    { name: "regionRef", type: "relationship", relationTo: "qurbani-regions", index: true },
    { name: "campaign", type: "relationship", relationTo: "campaigns", required: true, index: true },
    { name: "fundingPool", type: "relationship", relationTo: "campaign-funding-pools", required: true, index: true },
    { name: "title", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", localized: true },
    { name: "region", type: "text", required: true, localized: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "kind", type: "select", required: true, options: ["cattle", "small_livestock"], index: true },
    { name: "price", type: "number", required: true, min: 0 },
    { name: "currency", type: "select", required: true, defaultValue: "TRY", options: ["TRY", "USD", "EUR", "GBP"] },
    { name: "capacity", type: "number", required: true, defaultValue: 7, min: 1, max: 7 },
    { name: "salesStartAt", type: "date" },
    { name: "salesEndAt", type: "date" },
    { name: "sortOrder", type: "number", required: true, defaultValue: 0 },
    { name: "isActive", type: "checkbox", required: true, defaultValue: true, index: true },
    { name: "currentPriceRevision", type: "relationship", relationTo: "qurbani-price-revisions", index: true },
  ],
};
