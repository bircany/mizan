export type CampaignDeleteFacts = {
  confirmedUnits: number;
  donationCount: number;
  intentCount: number;
  reservedUnits: number;
};

export function campaignDeleteBlockReason({
  confirmedUnits,
  donationCount,
  intentCount,
  reservedUnits,
}: CampaignDeleteFacts): string | null {
  if (confirmedUnits > 0 || donationCount > 0) {
    return "Bu kampanyada kesinleşmiş bağış veya alınmış hisse var; fiziksel olarak silinemez. Kampanyayı arşivleyin.";
  }
  if (reservedUnits > 0) {
    return "Bu kampanyada bekleyen hisse rezervasyonu var. Rezervasyon sona erdikten sonra tekrar deneyin.";
  }
  if (intentCount > 0) {
    return "Bu kampanyada başlatılmış ödeme kaydı var; finansal iz korunacağı için fiziksel olarak silinemez. Kampanyayı arşivleyin.";
  }
  return null;
}

export function campaignCountersAllowDelete(campaign: {
  confirmedUnits?: number | null;
  reservedUnits?: number | null;
}) {
  return (
    Number(campaign.confirmedUnits || 0) === 0 &&
    Number(campaign.reservedUnits || 0) === 0
  );
}
