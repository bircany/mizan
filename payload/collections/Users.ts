import type { CollectionConfig } from "payload";

import { superAdminsOnly, usersReadAccess, usersUpdateAccess } from "@/payload/access";
import { USER_ROLES } from "@/lib/auth/roles";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role", "isActive", "updatedAt"],
  },
  access: {
    create: superAdminsOnly,
    read: usersReadAccess,
    update: usersUpdateAccess,
    delete: superAdminsOnly,
  },
  timestamps: true,
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.isActive === false) {
          throw new Error("Bu kullanici hesabi pasife alinmistir.");
        }
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      saveToJWT: true,
      defaultValue: "field_operator",
      options: USER_ROLES.map((role) => ({
        label: role,
        value: role,
      })),
      access: {
        create: ({ req }) => Boolean(req.user?.role === "super_admin"),
        read: ({ req }) => Boolean(req.user),
        update: ({ req }) => Boolean(req.user?.role === "super_admin"),
      },
    },
    {
      name: "isActive",
      type: "checkbox",
      defaultValue: true,
      access: {
        create: ({ req }) => Boolean(req.user?.role === "super_admin"),
        update: ({ req }) => Boolean(req.user?.role === "super_admin"),
      },
    },
    {
      name: "lastLoginAt",
      type: "date",
      admin: {
        readOnly: true,
        position: "sidebar",
      },
    },
  ],
};
