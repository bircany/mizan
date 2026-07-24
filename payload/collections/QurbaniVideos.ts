import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from "payload";

import { superAdminsOnly } from "@/payload/access";

type User = { id?: number | string; role?: string | null };
const relationId = (value: unknown) => typeof value === "object" && value && "id" in value ? (value as { id: number | string }).id : value;

const assignedVideoAccess: Access = ({ req }) => {
  const user = req.user as User | null;
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "field_operator") return false;
  return { fieldTask: { assignedTo: { equals: user.id } } } as Where;
};

const canCreateVideo: Access = ({ req }) => {
  const user = req.user as User | null;
  return user?.role === "super_admin" || user?.role === "field_operator";
};

const assertAssignedVideo: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const user = req.user as User | null;
  if (!user || user.role === "super_admin") return data;
  if (user.role !== "field_operator") throw new Error("Kurban videosu yukleme yetkiniz yok.");
  const taskId = relationId(data.fieldTask ?? originalDoc?.fieldTask);
  if (!taskId) throw new Error("Atanmis saha gorevi zorunludur.");
  const task = await req.payload.findByID({ collection: "field-tasks", id: taskId as number | string, depth: 0, overrideAccess: true });
  if (String(relationId(task.assignedTo)) !== String(user.id)) throw new Error("Yalnizca size atanmis kurban gorevine video yukleyebilirsiniz.");
  return data;
};

export const QurbaniVideos: CollectionConfig = {
  slug: "qurbani-videos",
  admin: { useAsTitle: "uploadId", group: "Kurban", defaultColumns: ["uploadId", "pool", "status", "durationSeconds", "approvedAt", "updatedAt"] },
  access: { read: assignedVideoAccess, create: canCreateVideo, update: assignedVideoAccess, delete: superAdminsOnly },
  timestamps: true,
  hooks: { beforeChange: [assertAssignedVideo] },
  fields: [
    { name: "pool", type: "relationship", relationTo: "qurbani-pools", required: true, index: true },
    { name: "fieldTask", type: "relationship", relationTo: "field-tasks", required: true, index: true },
    { name: "uploadedBy", type: "relationship", relationTo: "users", required: true, index: true },
    { name: "uploadId", type: "text", required: true, unique: true, index: true },
    { name: "rawStorageKey", type: "text", required: true },
    { name: "processedStorageKey", type: "text" },
    { name: "thumbnailStorageKey", type: "text" },
    { name: "originalFilename", type: "text", required: true },
    { name: "mimeType", type: "text", required: true },
    { name: "sizeBytes", type: "number", required: true, min: 1 },
    { name: "durationSeconds", type: "number", min: 0 },
    { name: "status", type: "select", required: true, defaultValue: "uploaded", index: true, options: ["uploading", "uploaded", "processing", "ready_to_send", "ready_for_review", "approved", "superseded", "rejected", "failed"] },
    { name: "version", type: "number", required: true, defaultValue: 1, min: 1 },
    { name: "replacesVideo", type: "relationship", relationTo: "qurbani-videos", index: true },
    { name: "readyAt", type: "date" },
    { name: "correctionRequired", type: "checkbox", required: true, defaultValue: false, index: true },
    { name: "attemptCount", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "lastError", type: "textarea" },
    { name: "approvedAt", type: "date" },
    { name: "approvedBy", type: "relationship", relationTo: "users" },
    { name: "rawDeleteAfter", type: "date" },
    { name: "processedDeleteAfter", type: "date" },
  ],
};
