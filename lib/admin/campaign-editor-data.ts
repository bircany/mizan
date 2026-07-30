import "server-only";

import type { CampaignEditorRecord } from "@/components/admin/unified-campaign-editor";
import { lexicalParagraphs } from "@/lib/pages";
import { getPayloadClient } from "@/lib/payload";

function relationId(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: number | string }).id);
  }
  return "";
}

function localDate(value: unknown) {
  return typeof value === "string" && value ? value.slice(0, 16) : "";
}

export async function getCampaignEditorData() {
  const payload = await getPayloadClient();
  const [campaigns, categories, media, childDonationSettings] = await Promise.all([
    payload.find({
      collection: "campaigns",
      depth: 1,
      limit: 100,
      pagination: false,
      sort: "-updatedAt",
      locale: "tr",
      overrideAccess: true,
    }),
    payload.find({
      collection: "categories",
      depth: 0,
      limit: 100,
      pagination: false,
      sort: "sortOrder",
      locale: "tr",
      where: { isActive: { equals: true } },
      overrideAccess: true,
    }),
    payload.find({
      collection: "media",
      depth: 0,
      limit: 200,
      pagination: false,
      sort: "-updatedAt",
      overrideAccess: true,
    }),
    payload.find({ collection: "child-donation-settings" as never, depth: 0, limit: 1, pagination: false, overrideAccess: true }) as Promise<{ docs: Array<Record<string, unknown>> }>,
  ]);

  const categoryOptions = categories.docs.map((category) => ({
    label: category.name || category.slug,
    value: String(category.id),
  }));
  const mediaOptions = media.docs.map((item) => ({
    label: item.alt || item.filename || `Görsel ${item.id}`,
    value: String(item.id),
  }));
  const records: CampaignEditorRecord[] = campaigns.docs.map((campaign) => ({
    id: String(campaign.id),
    title: campaign.title,
    description: lexicalParagraphs(campaign.description).join("\n\n"),
    category: relationId(campaign.category),
    currency: campaign.currency || "TRY",
    pricingModel: campaign.pricingModel,
    targetAmount: campaign.targetAmount ?? null,
    unitPrice: campaign.unitPrice ?? null,
    unitLabel: campaign.unitLabel || "",
    totalStock: campaign.totalStock ?? null,
    videoDelivery: campaign.videoDelivery,
    operationType: campaign.operationType || "",
    groupCapacity: campaign.groupCapacity ?? null,
    participantRequired: campaign.participantRequired,
    publishStartAt: localDate(campaign.publishStartAt),
    publishEndAt: localDate(campaign.publishEndAt),
    messageTemplate: campaign.messageTemplate || "",
    slaughterScript: campaign.slaughterScript || "",
    slaughterScriptVersion: campaign.slaughterScriptVersion ?? null,
    status: campaign.status,
    image: relationId(campaign.image),
  }));

  const saved = childDonationSettings.docs[0];
  const childDonation = saved ? {
    campaign: relationId(saved.campaign),
    foodPrice: Number(saved.foodPrice),
    stationeryPrice: Number(saved.stationeryPrice),
    toyPrice: Number(saved.toyPrice),
    clothingPrice: Number(saved.clothingPrice),
    usdCampaign: relationId(saved.usdCampaign),
    eurCampaign: relationId(saved.eurCampaign),
    foodUsdPrice: Number(saved.foodUsdPrice), stationeryUsdPrice: Number(saved.stationeryUsdPrice), toyUsdPrice: Number(saved.toyUsdPrice), clothingUsdPrice: Number(saved.clothingUsdPrice),
    foodEurPrice: Number(saved.foodEurPrice), stationeryEurPrice: Number(saved.stationeryEurPrice), toyEurPrice: Number(saved.toyEurPrice), clothingEurPrice: Number(saved.clothingEurPrice),
  } : null;

  return { categoryOptions, mediaOptions, records, childDonation };
}
