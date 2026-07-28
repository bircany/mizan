import type { CollectionConfig } from "payload";

import { financeOnly } from "@/payload/access";

export const DonationParticipants: CollectionConfig = {
  slug: "donation-participants",
  admin: {
    useAsTitle: "name",
    group: "Bagis Yonetimi",
    defaultColumns: ["name", "phone", "donationIntent", "donation", "orderIndex"],
  },
  access: {
    read: financeOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: "donationIntent", type: "relationship", relationTo: "donation-intents", required: true, index: true },
    { name: "donation", type: "relationship", relationTo: "donations", index: true },
    { name: "orderIndex", type: "number", required: true, min: 1 },
    { name: "name", type: "text", required: true },
    { name: "phone", type: "text" },
    { name: "effectivePhone", type: "text", required: true },
    { name: "isPayer", type: "checkbox", required: true, defaultValue: false },
    { name: "contactConsent", type: "checkbox", required: true, defaultValue: false },
    { name: "proxyConsent", type: "checkbox", required: true, defaultValue: false },
    {
      name: "nameReadingConsent",
      type: "checkbox",
      required: true,
      defaultValue: false,
      admin: {
        readOnly: true,
        description: "Hissedar adının aynı gruba gönderilen kesim videosunda duyulmasına ilişkin ayrı açık onay.",
      },
      access: { update: () => false },
    },
    {
      name: "nameReadingConsentTextVersion",
      type: "text",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "nameReadingConsentTextSnapshot",
      type: "textarea",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "nameReadingConsentAcceptedAt",
      type: "date",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "nameReadingConsentIp",
      type: "text",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "thirdPartyDataAuthorityConsent",
      type: "checkbox",
      required: true,
      defaultValue: false,
      admin: {
        readOnly: true,
        description: "Katılımcının üçüncü kişi bilgilerini paylaşmaya yetkili olduğuna ilişkin ayrı onay.",
      },
      access: { update: () => false },
    },
    {
      name: "thirdPartyDataAuthorityTextVersion",
      type: "text",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "thirdPartyDataAuthorityTextSnapshot",
      type: "textarea",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "thirdPartyDataAuthorityAcceptedAt",
      type: "date",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "thirdPartyDataAuthorityIp",
      type: "text",
      admin: { readOnly: true },
      access: { update: () => false },
    },
  ],
};
