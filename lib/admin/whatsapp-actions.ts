"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin/data";
import {
  connectEvolutionInstance,
  disconnectEvolutionInstance,
  getEvolutionConnectionStatus,
  type EvolutionConnectionStatus,
} from "@/lib/qurbani/evolution";

export type WhatsAppActionState = {
  success: boolean;
  message: string | null;
  status?: EvolutionConnectionStatus;
};

export async function manageWhatsAppConnection(
  _: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  await requireAdminUser(["admin"]);
  const intent = String(formData.get("intent") || "status");

  try {
    if (intent === "disconnect") {
      if (formData.get("confirm") !== "disconnect") {
        throw new Error("WhatsApp bağlantısını kapatma onayı eksik.");
      }
      await disconnectEvolutionInstance();
    } else if (intent !== "connect" && intent !== "status") {
      throw new Error("WhatsApp bağlantı işlemi geçerli değil.");
    }

    const status = intent === "connect"
      ? await connectEvolutionInstance()
      : await getEvolutionConnectionStatus();
    revalidatePath("/panel/whatsapp");

    return {
      success: status.state !== "error" && status.state !== "unconfigured",
      message: intent === "disconnect"
        ? "WhatsApp bağlantısı kapatıldı. Yeniden bağlanmak için QR kodu oluşturabilirsiniz."
        : status.message || null,
      status,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "WhatsApp bağlantı işlemi tamamlanamadı.",
      status: await getEvolutionConnectionStatus(),
    };
  }
}
