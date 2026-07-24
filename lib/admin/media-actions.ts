"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin/data";
import { getMediaUsage } from "@/lib/admin/media-data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export type MediaActionState = { message: string | null; success: boolean };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export async function uploadMedia(_: MediaActionState, formData: FormData): Promise<MediaActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);
  const file = formData.get("file");
  const alt = String(formData.get("alt") || "").trim();
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Yüklenecek bir görsel seçin." };
  if (!alt) return { success: false, message: "Alternatif metin zorunludur." };
  if (!allowedTypes.has(file.type)) return { success: false, message: "Yalnızca JPG, PNG ve WebP yükleyebilirsiniz." };
  if (file.size > maxBytes) return { success: false, message: "Görsel en fazla 10 MB olabilir." };
  try {
    const payload = await getPayloadClient();
    await payload.create({ collection: "media", data: { alt }, file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size } });
    revalidatePath("/panel/icerik/medya");
    return { success: true, message: "Görsel medya kütüphanesine eklendi." };
  } catch (error) { return { success: false, message: message(error, "Görsel yüklenemedi.") }; }
}

export async function updateMediaAlt(_: MediaActionState, formData: FormData): Promise<MediaActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);
  const id = String(formData.get("id") || "");
  const alt = String(formData.get("alt") || "").trim();
  if (!id || !alt) return { success: false, message: "Görsel ve alternatif metin zorunludur." };
  try {
    const payload = await getPayloadClient();
    await payload.update({ collection: "media", id, data: { alt } });
    revalidatePath("/panel/icerik/medya");
    return { success: true, message: "Alternatif metin güncellendi." };
  } catch (error) { return { success: false, message: message(error, "Alternatif metin güncellenemedi.") }; }
}

export async function deleteMedia(_: MediaActionState, formData: FormData): Promise<MediaActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);
  const id = String(formData.get("id") || "");
  if (!id) return { success: false, message: "Görsel kimliği bulunamadı." };
  try {
    const usage = await getMediaUsage(id);
    if (usage.length) return { success: false, message: `Bu görsel kullanılıyor: ${usage.slice(0, 3).join(", ")}` };
    const payload = await getPayloadClient();
    await payload.delete({ collection: "media", id });
    revalidatePath("/panel/icerik/medya");
    return { success: true, message: "Görsel ve yerel dosyası silindi." };
  } catch (error) { return { success: false, message: message(error, "Görsel silinemedi.") }; }
}
