import { databaseQuery } from "@/lib/database";

export async function closeCampaignAtTarget(campaignId: number) {
  const result = await databaseQuery<{ id: number }>(
    `update public.campaigns
     set status = 'closed',
         is_donation_open = false,
         updated_at = now()
     where id = $1
       and pricing_model = 'free'
       and status = 'active'
       and target_amount is not null
       and collected_amount >= target_amount
     returning id`,
    [campaignId],
  );
  return result.rowCount === 1;
}
