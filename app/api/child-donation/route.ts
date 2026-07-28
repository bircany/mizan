import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";

export async function GET() {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "child-donation-settings" as never, limit: 1, depth: 0, pagination: false, overrideAccess: true }) as unknown as { docs: Array<Record<string, unknown>> };
  const settings = result.docs[0];
  if (!settings) return NextResponse.json({ configured: false });
  const campaignId = (value: unknown) => typeof value === "object" && value && "id" in value ? String((value as { id: string | number }).id) : String(value || "");
  const campaigns = { TRY: campaignId(settings.campaign), USD: campaignId(settings.usdCampaign), EUR: campaignId(settings.eurCampaign) };
  if (!campaigns.TRY || !campaigns.USD || !campaigns.EUR) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, campaigns, prices: { TRY: { food: Number(settings.foodPrice), stationery: Number(settings.stationeryPrice), toy: Number(settings.toyPrice), clothing: Number(settings.clothingPrice) }, USD: { food: Number(settings.foodUsdPrice), stationery: Number(settings.stationeryUsdPrice), toy: Number(settings.toyUsdPrice), clothing: Number(settings.clothingUsdPrice) }, EUR: { food: Number(settings.foodEurPrice), stationery: Number(settings.stationeryEurPrice), toy: Number(settings.toyEurPrice), clothing: Number(settings.clothingEurPrice) } } });
}
