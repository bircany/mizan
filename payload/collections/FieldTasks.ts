import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import {
  approverOrAdmin,
  fieldTaskReadAccess,
  fieldTaskUpdateAccess,
} from "@/payload/access";

function getRequestRole(user: unknown) {
  if (!user || typeof user !== "object") return null;
  return (user as { role?: string | null }).role || null;
}

const canManageTaskDefinition = ({ req }: { req: { user: unknown } }) => {
  const role = getRequestRole(req.user);
  return role === "super_admin" || role === "approver";
};

const isSuperAdmin = ({ req }: { req: { user: unknown } }) =>
  getRequestRole(req.user) === "super_admin";

const getRelationId = (value: unknown) =>
  typeof value === "object" && value && "id" in value
    ? (value as { id: number | string }).id
    : value as number | string | undefined;

const assertFieldOperatorAssignee: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const assignedToId = getRelationId(data.assignedTo ?? originalDoc?.assignedTo);
  if (!assignedToId) throw new Error("Saha gorevlisi zorunludur.");

  const assignee = await req.payload.findByID({
    collection: "users",
    id: assignedToId,
    depth: 0,
    overrideAccess: true,
  });

  if (assignee.role !== "field_operator") {
    throw new Error("Saha gorevi yalnizca saha operasyon gorevlisine atanabilir.");
  }

  return data;
};

export const FieldTasks: CollectionConfig = {
  slug: "field-tasks",
  admin: {
    useAsTitle: "title",
    group: "Saha",
    defaultColumns: ["title", "location", "status", "assignedTo", "dueAt"],
  },
  access: {
    read: fieldTaskReadAccess,
    create: approverOrAdmin,
    update: fieldTaskUpdateAccess,
    delete: approverOrAdmin,
  },
  timestamps: true,
  hooks: {
    beforeChange: [assertFieldOperatorAssignee],
  },
  fields: [
    {
      name: "campaign",
      type: "relationship",
      relationTo: "campaigns",
      required: true,
      access: { update: canManageTaskDefinition },
    },
    {
      name: "qurbaniPool",
      type: "relationship",
      relationTo: "qurbani-pools",
      access: { update: canManageTaskDefinition },
      admin: { description: "Bu görev bir kurban havuzuna bağlıysa seçilir." },
    },
    { name: "title", type: "text", required: true, access: { update: canManageTaskDefinition } },
    { name: "location", type: "text", required: true, access: { update: canManageTaskDefinition } },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      required: true,
      access: { update: canManageTaskDefinition },
      filterOptions: {
        role: {
          equals: "field_operator",
        },
      },
    },
    { name: "dueAt", type: "date", access: { update: canManageTaskDefinition } },
    {
      name: "status",
      type: "select",
      options: ["todo", "in_progress", "submitted", "approved", "needs_revision"],
      defaultValue: "todo",
      access: { update: isSuperAdmin },
    },
    { name: "notes", type: "textarea" },
  ],
};
