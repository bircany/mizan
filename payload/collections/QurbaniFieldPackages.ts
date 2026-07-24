import type { Access, CollectionConfig, Where } from "payload";
import { superAdminsOnly } from "@/payload/access";

const fieldPackageRead: Access = ({ req }) => {
  const user = req.user as { id?: number | string; role?: string | null } | null;
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "field_operator") return false;
  return { assignedTo: { equals: user.id } } as Where;
};

export const QurbaniFieldPackages: CollectionConfig = {
  slug: "qurbani-field-packages",
  admin: { useAsTitle: "name", group: "Kurban Saha", defaultColumns: ["code", "name", "season", "country", "status", "assignedTo", "dueAt"] },
  access: { read: fieldPackageRead, create: superAdminsOnly, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "season", type: "relationship", relationTo: "qurbani-seasons", required: true, index: true },
    { name: "country", type: "relationship", relationTo: "qurbani-countries", required: true, index: true },
    { name: "region", type: "relationship", relationTo: "qurbani-regions", index: true },
    { name: "code", type: "text", required: true, unique: true, index: true },
    { name: "name", type: "text", required: true },
    { name: "idempotencyKey", type: "text", required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: "status", type: "select", required: true, defaultValue: "draft", index: true, options: ["draft", "assigned", "in_progress", "completed", "cancelled"] },
    { name: "assignedTo", type: "relationship", relationTo: "users", index: true },
    { name: "dueAt", type: "date" },
    { name: "startedAt", type: "date" },
    { name: "completedAt", type: "date" },
    { name: "notes", type: "textarea" },
  ],
};
