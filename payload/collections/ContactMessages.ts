import type { CollectionConfig } from "payload";

import { superAdminsOnly } from "@/payload/access";

export const ContactMessages: CollectionConfig = {
  slug: "contact-messages",
  admin: { useAsTitle: "name", group: "Icerik", defaultColumns: ["name", "subject", "status", "createdAt"] },
  access: { read: superAdminsOnly, create: () => false, update: superAdminsOnly, delete: superAdminsOnly },
  timestamps: true,
  fields: [
    { name: "type", type: "select", required: true, options: ["contact", "student"], defaultValue: "contact" },
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "phone", type: "text" },
    { name: "subject", type: "text" },
    { name: "program", type: "text" },
    { name: "message", type: "textarea" },
    { name: "privacyConsent", type: "checkbox", required: true },
    { name: "status", type: "select", required: true, options: ["unread", "read", "archived"], defaultValue: "unread" },
    { name: "readAt", type: "date" },
    { name: "readBy", type: "relationship", relationTo: "users" },
    { name: "emailNotificationStatus", type: "select", options: ["sent", "failed", "skipped"], admin: { readOnly: true } },
  ],
};
