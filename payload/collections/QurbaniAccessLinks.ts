import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const QurbaniAccessLinks: CollectionConfig = {
  slug: "qurbani-access-links",
  admin: { useAsTitle: "tokenDigest", group: "Kurban", defaultColumns: ["pool", "recipientPhone", "expiresAt", "revokedAt", "lastAccessedAt"] },
  access: { read: superAdminsOnly, create: () => false, update: () => false, delete: () => false },
  timestamps: true,
  fields: [
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "order", type: "relationship", relationTo: "qurbani-orders", required: true, index: true },
    { name: "video", type: "relationship", relationTo: "qurbani-videos", required: true, index: true },
    { name: "tokenDigest", type: "text", required: true, unique: true, index: true },
    { name: "recipientPhone", type: "text", required: true },
    { name: "recipientPhoneHash", type: "text", required: true, index: true },
    { name: "shareIds", type: "json", required: true },
    { name: "shares", type: "relationship", relationTo: "qurbani-shares", hasMany: true, required: true },
    { name: "expiresAt", type: "date", required: true, index: true },
    { name: "revokedAt", type: "date" },
    { name: "lastAccessedAt", type: "date" },
    { name: "accessCount", type: "number", required: true, defaultValue: 0, min: 0 },
  ],
};
