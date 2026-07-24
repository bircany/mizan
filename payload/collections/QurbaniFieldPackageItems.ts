import type { Access, CollectionConfig, Where } from "payload";
import { superAdminsOnly } from "@/payload/access";

const fieldPackageItemRead: Access = ({ req }) => {
  const user = req.user as { id?: number | string; role?: string | null } | null;
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "field_operator") return false;
  return { "fieldPackage.assignedTo": { equals: user.id } } as Where;
};

export const QurbaniFieldPackageItems: CollectionConfig = {
  slug: "qurbani-field-package-items",
  admin: { useAsTitle: "id", group: "Kurban Saha", defaultColumns: ["fieldPackage", "pool", "ordinal", "status", "fieldTask"] },
  access: { read: fieldPackageItemRead, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "fieldPackage", type: "relationship", relationTo: "qurbani-field-packages", required: true, index: true },
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, unique: true, index: true },
    { name: "ordinal", type: "number", required: true, min: 1 },
    { name: "status", type: "select", required: true, defaultValue: "planned", options: ["planned", "in_progress", "completed", "failed"] },
    { name: "fieldTask", type: "relationship", relationTo: "field-tasks", index: true },
  ],
};
