"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/session";
import { withDatabaseTransaction } from "@/lib/database";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { GroupPlanError } from "@/lib/donations/group-plan";
import { loadTailGroups, reviseTailGroups } from "@/lib/donations/tail-groups";
import {
  moneyCents,
  ManualDonationError,
} from "@/lib/donations/manual-validation";

async function admin() {
  const user = await getAdminSession();
  if (!user || user.role !== "admin")
    throw new GroupPlanError("Bu işlem yalnızca admin tarafından yapılabilir.");
  await enforceRateLimit({
    scope: "tail-groups",
    identity: String(user.id),
    maxRequests: 30,
    windowSeconds: 60,
  });
  return user;
}
function id(value: unknown) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1)
    throw new GroupPlanError("Kampanya kimliği geçersiz.");
  return result;
}
function message(error: unknown) {
  return error instanceof GroupPlanError ||
    error instanceof RateLimitError ||
    error instanceof ManualDonationError
    ? error.message
    : "Grup işlemi tamamlanamadı. Önizlemeyi yenileyerek tekrar deneyin.";
}
export async function previewTailGroups(campaignId: string) {
  try {
    await admin();
    const key = id(campaignId);
    const data = await withDatabaseTransaction((client) =>
      loadTailGroups(client, key),
    );
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, message: message(error) };
  }
}
export async function saveTailGroups(form: FormData) {
  try {
    const actor = await admin();
    const input = {
      campaignId: id(form.get("campaignId")),
      version: String(form.get("version") || ""),
      counts: [Number(form.get("count0")), Number(form.get("count1"))],
      prices: [
        moneyCents(String(form.get("price0") || "")),
        moneyCents(String(form.get("price1") || "")),
      ],
      reason: String(form.get("reason") || ""),
      confirmed: form.get("confirmed") === "on",
    };
    await withDatabaseTransaction((client) =>
      reviseTailGroups(client, input, {
        id: actor.id,
        email: String(actor.email),
      }),
    );
    try {
      revalidatePath("/panel/bagis-yonetimi");
      revalidatePath("/panel/video-teslimat");
    } catch {
      /* committed transaction remains successful */
    }
    return {
      success: true as const,
      message: "Son iki grup güncellendi. Geçmiş tahsilatlar değiştirilmedi.",
    };
  } catch (error) {
    return { success: false as const, message: message(error) };
  }
}
