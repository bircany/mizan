"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { buildProtectedDeliveryTemplate } from "@/lib/delivery/template";
import { plainTextEditorState } from "@/lib/pages";
import { getPayloadClient } from "@/lib/payload";

export type CampaignActionState = {
  success: boolean;
  message: string | null;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function positiveNumber(
  formData: FormData,
  name: string,
  required = false,
) {
  const raw = text(formData, name);
  if (!raw && !required) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} alanı sıfırdan büyük olmalıdır.`);
  }
  return value;
}

function positiveInteger(
  formData: FormData,
  name: string,
  required = false,
) {
  const value = positiveNumber(formData, name, required);
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw new Error(`${name} alanı pozitif tam sayı olmalıdır.`);
  }
  return value;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(
  title: string,
  currentId: string | undefined,
) {
  const payload = await getPayloadClient();
  const base = slugify(title) || `bagis-${Date.now()}`;
  let candidate = base;
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const found = await payload.find({
      collection: "campaigns",
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (
      !found.docs[0] ||
      (currentId && String(found.docs[0].id) === currentId)
    ) {
      return candidate;
    }
    candidate = `${base}-${suffix + 1}`;
  }
  return `${base}-${Date.now()}`;
}

export async function saveUnifiedCampaign(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.donationManagement);

  try {
    const payload = await getPayloadClient();
    const id = text(formData, "id") || undefined;
    const title = text(formData, "title");
    const description = text(formData, "description");
    const category = text(formData, "category");
    const currency = text(formData, "currency") || "TRY";
    const pricingModel = text(formData, "pricingModel");
    const videoDelivery = text(formData, "videoDelivery");
    const status = text(formData, "status") || "draft";
    const image = text(formData, "image") || undefined;
    if (!title || !category) {
      throw new Error("Başlık ve kategori zorunludur.");
    }
    if (!["free", "fixed"].includes(pricingModel)) {
      throw new Error("Tutar modeli seçilmelidir.");
    }
    if (!["none", "video"].includes(videoDelivery)) {
      throw new Error("Videolu veya videosuz seçimi zorunludur.");
    }
    if (!["draft", "active", "closed", "archived"].includes(status)) {
      throw new Error("Kampanya durumu geçersiz.");
    }

    const targetAmount =
      pricingModel === "free"
        ? positiveNumber(formData, "targetAmount", true)
        : undefined;
    const unitPrice =
      pricingModel === "fixed"
        ? positiveNumber(formData, "unitPrice", true)
        : undefined;
    const totalStock =
      pricingModel === "fixed"
        ? positiveInteger(formData, "totalStock")
        : undefined;
    const groupCapacity =
      videoDelivery === "video" && pricingModel === "fixed"
        ? positiveInteger(formData, "groupCapacity", true)
        : undefined;
    const publishStartAt = text(formData, "publishStartAt");
    const publishEndAt = text(formData, "publishEndAt");
    if (
      (publishStartAt && !Number.isFinite(new Date(publishStartAt).getTime())) ||
      (publishEndAt && !Number.isFinite(new Date(publishEndAt).getTime()))
    ) {
      throw new Error("Yayın başlangıç veya bitiş tarihi geçersiz.");
    }
    if (
      publishStartAt &&
      publishEndAt &&
      new Date(publishEndAt) <= new Date(publishStartAt)
    ) {
      throw new Error("Yayın bitişi başlangıçtan sonra olmalıdır.");
    }

    const existing = id
      ? await payload.findByID({
          collection: "campaigns",
          id,
          depth: 0,
          overrideAccess: true,
        })
      : null;
    const slug = existing?.slug || (await uniqueSlug(title, id));
    const data = {
      title,
      description: description
        ? plainTextEditorState(description)
        : undefined,
      category: Number(category),
      currency,
      pricingModel,
      targetAmount,
      unitPrice,
      unitLabel:
        pricingModel === "fixed"
          ? text(formData, "unitLabel") || "adet"
          : undefined,
      totalStock,
      videoDelivery,
      groupCapacity,
      participantRequired:
        formData.get("participantRequired") === "on",
      publishStartAt: publishStartAt
        ? new Date(publishStartAt).toISOString()
        : undefined,
      publishEndAt: publishEndAt
        ? new Date(publishEndAt).toISOString()
        : undefined,
      messageTemplate:
        videoDelivery === "video"
          ? buildProtectedDeliveryTemplate(text(formData, "messageBody"))
          : undefined,
      status,
      isDonationOpen: status === "active",
      reportingMode: "pool",
      image: image ? Number(image) : undefined,
      coverImageAlt: title,
      slug,
      code: existing?.code || slug,
    };

    if (id) {
      await payload.update({
        collection: "campaigns",
        id,
        data: data as never,
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "campaigns",
        data: data as never,
        overrideAccess: true,
      });
    }

    revalidatePath("/panel/bagis-yonetimi");
    revalidatePath("/panel/icerik/bagis-alanlari");
    revalidatePath("/bagis");
    revalidatePath("/kurban");
    return {
      success: true,
      message: id ? "Kampanya güncellendi." : "Kampanya oluşturuldu.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Kampanya kaydedilemedi.",
    };
  }
}

export async function deleteUnifiedCampaign(
  _: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.donationManagement);
  try {
    const id = text(formData, "id");
    if (!id) throw new Error("Kampanya kimliği eksik.");
    const payload = await getPayloadClient();
    const campaign = await payload.findByID({
      collection: "campaigns",
      id,
      depth: 0,
      overrideAccess: true,
    });
    if (campaign.status !== "draft") {
      throw new Error(
        "Yalnızca boş taslak kampanya tamamen silinebilir. Bu kampanyayı kapatın veya arşivleyin.",
      );
    }
    const [intents, donations] = await Promise.all([
      payload.find({
        collection: "donation-intents",
        where: { campaign: { equals: id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "donations",
        where: { campaign: { equals: id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
    ]);
    if (intents.totalDocs > 0 || donations.totalDocs > 0) {
      throw new Error(
        "Bu kampanyada işlem geçmişi var; fiziksel olarak silinemez. Kampanyayı arşivleyin.",
      );
    }
    await payload.delete({
      collection: "campaigns",
      id,
      overrideAccess: true,
    });
    revalidatePath("/panel/bagis-yonetimi");
    revalidatePath("/panel/icerik/bagis-alanlari");
    revalidatePath("/bagis");
    revalidatePath("/kurban");
    return { success: true, message: "Boş taslak silindi." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Kampanya silinemedi.",
    };
  }
}
