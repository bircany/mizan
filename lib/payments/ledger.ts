import { getSupabaseServiceClient } from "@/lib/supabase-server";

type LedgerEntryInput = {
  donationId: number;
  campaignId: number;
  refundRequestId?: number | null;
  entryType: "capture" | "refund" | "cancel";
  amount: number;
  currency: "TRY" | "USD" | "EUR" | "GBP";
  providerReference?: string | null;
  idempotencyKey: string;
  removeDonor?: boolean;
  metadata?: Record<string, unknown>;
};

export async function recordPaymentLedgerEntry(input: LedgerEntryInput) {
  const { data, error } = await getSupabaseServiceClient().rpc("record_payment_ledger_entry", {
    p_donation_id: input.donationId,
    p_campaign_id: input.campaignId,
    p_refund_request_id: input.refundRequestId ?? null,
    p_entry_type: input.entryType,
    p_amount: input.amount,
    p_currency: input.currency,
    p_provider_reference: input.providerReference ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_remove_donor: input.removeDonor ?? false,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Odeme defteri kaydi olusturulamadi: ${error.message}`);
  }

  return Boolean(data);
}
