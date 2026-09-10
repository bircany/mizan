import { CampaignInputError } from "@/lib/admin/campaign-save-intent";

export function roundedGroupStock(
  stock: number | undefined,
  capacity: number | undefined,
) {
  if (capacity === undefined) return stock;
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 500)
    throw new CampaignInputError(
      "Grup kapasitesi 1–500 arasında tam sayı olmalıdır.",
    );
  if (stock === undefined) return undefined;
  if (!Number.isSafeInteger(stock) || stock < 1 || stock > 1_000_000)
    throw new CampaignInputError(
      "Toplam stok 1–1.000.000 arasında tam sayı olmalıdır.",
    );
  const rounded = Math.ceil(stock / capacity) * capacity;
  if (rounded > 1_000_000)
    throw new CampaignInputError("Yuvarlanmış stok sınırı aşıyor.");
  return rounded;
}

export class GroupPlanError extends Error {}

export function validateTailPlan(
  counts: number[],
  prices: number[],
  total: number,
  maximum: number,
  minimum = 1,
) {
  if (
    counts.length !== 2 ||
    prices.length !== 2 ||
    counts.some((n) => !Number.isSafeInteger(n) || n < minimum || n > maximum)
  )
    throw new GroupPlanError(
      `İki grubun her biri ${minimum}–${maximum} hisse içermelidir.`,
    );
  if (counts[0] + counts[1] !== total)
    throw new GroupPlanError(
      `Toplam ${total} hisse korunmalıdır; hisse eklenemez veya silinemez.`,
    );
  if (
    prices.some(
      (n) => !Number.isSafeInteger(n) || n < 100 || n > 100_000_000_000,
    )
  )
    throw new GroupPlanError(
      "Geçerli bir hisse bedeli girin (en az 1, en fazla iki ondalık).",
    );
}
