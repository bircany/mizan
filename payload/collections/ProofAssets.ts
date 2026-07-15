import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import {
  fieldOperatorsOnly,
  proofAssetReadAccess,
  proofAssetUpdateAccess,
} from "@/payload/access";

const getRelationId = (value: unknown) =>
  typeof value === "object" && value && "id" in value
    ? (value as { id: number | string }).id
    : value as number | string | undefined;

const canSetDonorVisibility = ({ req }: { req: { user: unknown } }) => {
  if (!req.user || typeof req.user !== "object") return false;
  const role = (req.user as { role?: string | null }).role;
  return role === "super_admin" || role === "approver";
};

const assertAssetOwnership: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const user = req.user as { id?: number | string; role?: string | null } | null;
  if (!user || user.role !== "field_operator") return data;

  const submissionId = getRelationId(data.submission ?? originalDoc?.submission);
  if (!submissionId) throw new Error("Kanit gonderimi zorunludur.");

  if (
    originalDoc?.submission &&
    String(getRelationId(originalDoc.submission)) !== String(submissionId)
  ) {
    throw new Error("Kanit dosyasinin gonderimi sonradan degistirilemez.");
  }

  const submission = await req.payload.findByID({
    collection: "proof-submissions",
    id: submissionId,
    depth: 1,
    overrideAccess: true,
  });
  const taskId = getRelationId(submission.fieldTask);
  if (!taskId) throw new Error("Kanit gonderiminin saha gorevi bulunamadi.");
  const task = await req.payload.findByID({
    collection: "field-tasks",
    id: taskId,
    depth: 0,
    overrideAccess: true,
  });

  if (String(getRelationId(task.assignedTo)) !== String(user.id)) {
    throw new Error("Yalnizca size atanmis gorevlerin kanit dosyalarini yonetebilirsiniz.");
  }

  if (operation === "create") {
    data.uploadedBy = user.id;
  }

  return data;
};

export const ProofAssets: CollectionConfig = {
  slug: "proof-assets",
  admin: {
    useAsTitle: "fileName",
    group: "Saha",
    defaultColumns: ["fileName", "kind", "isDonorVisible", "updatedAt"],
  },
  access: {
    read: proofAssetReadAccess,
    create: fieldOperatorsOnly,
    update: proofAssetUpdateAccess,
    delete: fieldOperatorsOnly,
  },
  timestamps: true,
  hooks: {
    beforeChange: [assertAssetOwnership],
  },
  fields: [
    { name: "submission", type: "relationship", relationTo: "proof-submissions", required: true },
    {
      name: "kind",
      type: "select",
      options: ["document", "photo", "video"],
      required: true,
    },
    { name: "storagePath", type: "text", required: true },
    { name: "fileName", type: "text", required: true },
    { name: "mimeType", type: "text", required: true },
    { name: "size", type: "number", min: 0 },
    { name: "caption", type: "text" },
    { name: "isDonorVisible", type: "checkbox", defaultValue: false, access: { update: canSetDonorVisibility } },
    { name: "uploadedBy", type: "relationship", relationTo: "users", access: { update: () => false } },
  ],
};
