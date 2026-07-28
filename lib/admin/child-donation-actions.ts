"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";
import { withDatabaseTransaction } from "@/lib/database";

export type ChildDonationSettingsActionState = { success: boolean; message: string | null };

async function getOrCreateAhmetCampaign(currency: "TRY" | "USD" | "EUR") {
  const code = `ahmet-destek-${currency.toLowerCase()}`;
  return withDatabaseTransaction(async (client) => {
    const existing = await client.query<{ id: number }>("select id from public.campaigns where code = $1 limit 1", [code]);
    if (existing.rows[0]) return existing.rows[0];
    const created = await client.query<{ id: number }>("insert into public.campaigns (code, slug, currency, pricing_model, target_amount, video_delivery, status, is_donation_open, reporting_mode) values ($1, $2, $3::public.enum_campaigns_currency, 'free', 999999999, 'none', 'active', true, 'pool') returning id", [code, code, currency]);
    const id = created.rows[0]?.id;
    if (!id) throw new Error("Ahmet yardım kampanyası oluşturulamadı.");
    await client.query("insert into public.campaigns_locales (title, _locale, _parent_id) values ($1, 'tr', $2)", [`Ahmet'e Destek (${currency})`, id]);
    return { id };
  });
}

const price = (formData: FormData, name: string, minimum = 1) => {
  const value = Number(formData.get(name));
  if (!Number.isFinite(value) || value < minimum || value > 1_000_000) throw new Error("Her paket fiyatı geçerli ve sıfırdan büyük olmalıdır.");
  return Number(value.toFixed(2));
};

export async function saveChildDonationSettings(_: ChildDonationSettingsActionState, formData: FormData): Promise<ChildDonationSettingsActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.donationManagement);
  try {
    const [tryCampaign, usdCampaign, eurCampaign] = await Promise.all([getOrCreateAhmetCampaign("TRY"), getOrCreateAhmetCampaign("USD"), getOrCreateAhmetCampaign("EUR")]);
    const data = {
      campaign: Number(tryCampaign.id), usdCampaign: Number(usdCampaign.id), eurCampaign: Number(eurCampaign.id),
      foodPrice: price(formData, "foodPrice"), stationeryPrice: price(formData, "stationeryPrice"), toyPrice: price(formData, "toyPrice"), clothingPrice: price(formData, "clothingPrice"),
      foodUsdPrice: price(formData, "foodUsdPrice", 0.01), stationeryUsdPrice: price(formData, "stationeryUsdPrice", 0.01), toyUsdPrice: price(formData, "toyUsdPrice", 0.01), clothingUsdPrice: price(formData, "clothingUsdPrice", 0.01),
      foodEurPrice: price(formData, "foodEurPrice", 0.01), stationeryEurPrice: price(formData, "stationeryEurPrice", 0.01), toyEurPrice: price(formData, "toyEurPrice", 0.01), clothingEurPrice: price(formData, "clothingEurPrice", 0.01),
    };
    const payload = await getPayloadClient();
    const existing = await payload.find({ collection: "child-donation-settings" as never, limit: 1, depth: 0, pagination: false, overrideAccess: true }) as unknown as { docs: Array<{ id: string | number }> };
    if (existing.docs[0]) await payload.update({ collection: "child-donation-settings" as never, id: existing.docs[0].id, data: data as never, overrideAccess: true });
    else await payload.create({ collection: "child-donation-settings" as never, data: data as never, overrideAccess: true });
    revalidatePath("/");
    revalidatePath("/panel/bagis-yonetimi");
    return { success: true, message: "Ahmet'e destek paket fiyatları güncellendi." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "Ahmet ayarları kaydedilemedi." }; }
}
