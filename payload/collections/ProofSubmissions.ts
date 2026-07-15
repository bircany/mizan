import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import {
  approverOrAdmin,
  fieldOperatorsOnly,
  proofSubmissionReadAccess,
  proofSubmissionUpdateAccess,
} from "@/payload/access";

const isSuperAdmin = ({ req }: { req: { user: unknown } }) => {
  if (!req.user || typeof req.user !== "object") return false;
  return (req.user as { role?: string | null }).role === "super_admin";
};

const canReviewSubmission = ({ req }: { req: { user: unknown } }) => {
  if (!req.user || typeof req.user !== "object") return false;
  const role = (req.user as { role?: string | null }).role;
  return role === "super_admin" || role === "approver";
};

const getRelationId = (value: unknown) =>
  typeof value === "object" && value && "id" in value
    ? (value as { id: number | string }).id
    : value as number | string | undefined;

const assertAssignedFieldTask: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const user = req.user as { id?: number | string; role?: string | null } | null;
  if (!user || user.role !== "field_operator") return data;

  const fieldTaskId = getRelationId(data.fieldTask ?? originalDoc?.fieldTask);
  if (!fieldTaskId) throw new Error("Saha gorevi zorunludur.");

  if (
    originalDoc?.fieldTask &&
    String(getRelationId(originalDoc.fieldTask)) !== String(fieldTaskId)
  ) {
    throw new Error("Saha gorevi gonderim olusturulduktan sonra degistirilemez.");
  }

  const task = await req.payload.findByID({
    collection: "field-tasks",
    id: fieldTaskId,
    depth: 0,
    overrideAccess: true,
  });
  const assignedTo = getRelationId(task.assignedTo);

  if (String(assignedTo) !== String(user.id)) {
    throw new Error("Yalnizca size atanmis saha gorevleri icin kanit gonderebilirsiniz.");
  }

  return data;
};

export const ProofSubmissions: CollectionConfig = {
  slug: "proof-submissions",
  admin: {
    useAsTitle: "title",
    group: "Saha",
    defaultColumns: ["title", "status", "externalApprovalCode", "fieldTask", "updatedAt"],
  },
  access: {
    read: proofSubmissionReadAccess,
    create: fieldOperatorsOnly,
    update: proofSubmissionUpdateAccess,
    delete: approverOrAdmin,
  },
  timestamps: true,
  hooks: {
    beforeChange: [assertAssignedFieldTask],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "fieldTask", type: "relationship", relationTo: "field-tasks", required: true, access: { update: () => false } },
    { name: "donation", type: "relationship", relationTo: "donations", access: { update: () => false } },
    { name: "campaign", type: "relationship", relationTo: "campaigns", access: { update: () => false } },
    { name: "summary", type: "textarea" },
    { name: "externalApprovalCode", type: "text" },
    { name: "externalReferenceId", type: "text" },
    { name: "reviewNotes", type: "textarea", access: { update: canReviewSubmission } },
    {
      name: "status",
      type: "select",
      options: ["draft", "submitted", "external_pending", "review_pending", "approved", "rejected"],
      defaultValue: "draft",
      access: { update: isSuperAdmin },
    },
  ],
};
