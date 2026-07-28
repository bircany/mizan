import type { CollectionConfig } from "payload";

import { anyone, superAdminsOnly } from "@/payload/access";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const Campaigns: CollectionConfig = {
  slug: "campaigns",
  admin: {
    useAsTitle: "title",
    group: "Icerik",
    defaultColumns: ["title", "pricingModel", "status", "targetAmount", "collectedAmount", "category"],
    listSearchableFields: ["title", "description"],
  },
  access: {
    read: anyone,
    create: superAdminsOnly,
    update: superAdminsOnly,
    delete: superAdminsOnly,
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        const campaign = await req.payload.findByID({
          collection: "campaigns",
          id,
          depth: 0,
          overrideAccess: true,
        });
        if (campaign.status !== "draft") {
          throw new Error(
            "Yalnızca boş taslak kampanyalar silinebilir. Bu kampanyayı kapatın veya arşivleyin.",
          );
        }
        const [intents, donations] = await Promise.all([
          req.payload.count({
            collection: "donation-intents",
            where: { campaign: { equals: id } },
            overrideAccess: true,
          }),
          req.payload.count({
            collection: "donations",
            where: { campaign: { equals: id } },
            overrideAccess: true,
          }),
        ]);
        if (intents.totalDocs > 0 || donations.totalDocs > 0) {
          throw new Error(
            "Finansal veya rezervasyon kaydı bulunan kampanya silinemez; yalnızca arşivlenebilir.",
          );
        }
      },
    ],
  },
  timestamps: true,
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "description",
      type: "richText",
      localized: true,
    },
    {
      name: "targetAmount",
      type: "number",
      min: 0,
    },
    {
      name: "pricingModel",
      type: "select",
      required: true,
      defaultValue: "free",
      options: [
        { label: "Serbest tutar", value: "free" },
        { label: "Sabit tutar", value: "fixed" },
      ],
    },
    { name: "unitPrice", type: "number", min: 1 },
    { name: "unitLabel", type: "text" },
    { name: "totalStock", type: "number", min: 1 },
    {
      name: "reservedUnits",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "confirmedUnits",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "videoDelivery",
      type: "select",
      required: true,
      defaultValue: "none",
      options: [
        { label: "Videosuz", value: "none" },
        { label: "Videolu", value: "video" },
      ],
    },
    {
      name: "operationType",
      type: "select",
      options: [
        { label: "Standart video", value: "standard_video" },
        { label: "Kesim videosu", value: "slaughter_video" },
      ],
      admin: {
        condition: (_, siblingData) => siblingData?.videoDelivery === "video",
        description: "Videolu kampanyalarda kategori adından türetilmez; açıkça seçilmelidir.",
      },
      validate: (
        value: unknown,
        { siblingData }: { siblingData?: { videoDelivery?: unknown } },
      ) => {
        if (siblingData?.videoDelivery === "video" && !value) {
          return "Videolu kampanyalarda operasyon tipi zorunludur.";
        }
        return true;
      },
    },
    { name: "groupCapacity", type: "number", min: 1 },
    { name: "participantRequired", type: "checkbox", required: true, defaultValue: false },
    { name: "publishStartAt", type: "date" },
    { name: "publishEndAt", type: "date" },
    { name: "messageTemplate", type: "textarea" },
    {
      name: "slaughterScript",
      type: "textarea",
      admin: {
        condition: (_, siblingData) => siblingData?.operationType === "slaughter_video",
        description: "Kesim öncesi okunacak metin. Değişiklikler yeni videoları etkiler; eski videolar snapshot taşır.",
      },
    },
    {
      name: "slaughterScriptVersion",
      type: "number",
      min: 1,
      admin: {
        condition: (_, siblingData) => siblingData?.operationType === "slaughter_video",
      },
    },
    {
      name: "consentLegalReviewRequired",
      type: "checkbox",
      required: true,
      defaultValue: true,
      admin: {
        description: "Hissedar adı okuma ve üçüncü kişi onay metinleri canlı öncesi hukuk/KVKK kontrolü gerektirir.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      access: { update: () => false },
      options: [
        { label: "Taslak", value: "draft" },
        { label: "Aktif", value: "active" },
        { label: "Duraklatıldı", value: "paused" },
        { label: "Kapali", value: "closed" },
        { label: "Arsiv", value: "archived" },
      ],
    },
    {
      name: "pauseReason",
      type: "textarea",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "pausedAt",
      type: "date",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "pausedBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "closeReason",
      type: "textarea",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "closedAt",
      type: "date",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "closedBy",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "collectedAmount",
      type: "number",
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: "coverImagePath",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: "coverImageAlt",
      type: "text",
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (typeof value === "string" && value.trim()) return value;
            if (data?.title) {
              const title = typeof data.title === "string" ? data.title : data.title?.tr;
              return slugify(String(title || "bagis-alani")) || "bagis-alani";
            }

            return value;
          },
        ],
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
    },
    {
      name: "currency",
      type: "select",
      options: ["TRY", "USD", "EUR", "GBP"],
      defaultValue: "TRY",
    },
    {
      name: "reportingMode",
      type: "select",
      defaultValue: "pool",
      options: [
        {
          label: "Havuz",
          value: "pool",
        },
        {
          label: "Bagis Bazli",
          value: "donation_based",
        },
      ],
      admin: { hidden: true },
    },
    {
      name: "isDonationOpen",
      type: "checkbox",
      defaultValue: true,
      admin: { hidden: true },
      access: { update: () => false },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (typeof value === "string" && value.trim()) return value;
            if (data?.title) {
              const title = typeof data.title === "string" ? data.title : data.title?.tr;
              return slugify(String(title || "bagis-alani")) || "bagis-alani";
            }

            return value;
          },
        ],
      },
    },
    {
      name: "donorCount",
      type: "number",
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
      access: {
        update: () => false,
      },
    },
  ],
};
