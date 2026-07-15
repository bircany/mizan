"use server";

import { revalidatePath } from "next/cache";

import { PANEL_ROUTE_ACCESS, type PanelRouteKey } from "@/lib/auth/panel-access";
import { requireAdminUser } from "@/lib/admin/data";
import { getPayloadClient } from "@/lib/payload";
import type { ContentCollection } from "@/lib/admin/content";

export type ContentActionState = {
  message: string | null;
  success: boolean;
};

const contentRouteMap: Record<ContentCollection, PanelRouteKey> = {
  campaigns: "contentCampaigns",
  categories: "contentCategories",
  news: "contentNews",
  pages: "contentPages",
};

const contentPathMap: Record<ContentCollection, string> = {
  campaigns: "/panel/icerik/bagis-alanlari",
  categories: "/panel/icerik/kategoriler",
  news: "/panel/icerik/haberler",
  pages: "/panel/icerik/sayfalar",
};

function readText(formData: FormData, name: string, required = false) {
  const value = String(formData.get(name) || "").trim();
  if (required && !value) throw new Error(`${name} zorunludur.`);
  return value;
}

function readCollection(formData: FormData): ContentCollection {
  const collection = readText(formData, "collection", true);
  if (collection === "campaigns" || collection === "categories" || collection === "news" || collection === "pages") {
    return collection;
  }

  throw new Error("Geçersiz içerik türü.");
}

function localized(value: string) {
  return { tr: value };
}

function localizedRichText(value: ReturnType<typeof plainTextEditorState>) {
  return { tr: value };
}

function plainTextEditorState(text: string) {
  return {
    root: {
      children: [
        {
          children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
          direction: "ltr",
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function parsePositiveAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Hedef tutar geçersiz.");
  return amount;
}

function parseNewsCategory(value: string) {
  return ["haber", "etkinlik", "duyuru", "proje"].includes(value) ? value : "haber";
}

function parseCurrency(value: string) {
  return ["TRY", "USD", "EUR", "GBP"].includes(value) ? value : "TRY";
}

function contentData(collection: ContentCollection, formData: FormData) {
  if (collection === "campaigns") {
    const description = readText(formData, "description");
    return {
      code: readText(formData, "code", true),
      currency: parseCurrency(readText(formData, "currency")),
      description: description ? localizedRichText(plainTextEditorState(description)) : undefined,
      isDonationOpen: formData.get("isDonationOpen") === "on",
      slug: readText(formData, "slug", true),
      targetAmount: parsePositiveAmount(readText(formData, "targetAmount", true)),
      title: localized(readText(formData, "title", true)),
    };
  }

  if (collection === "categories") {
    return {
      color: readText(formData, "color"),
      icon: readText(formData, "icon"),
      name: localized(readText(formData, "name", true)),
      slug: readText(formData, "slug", true),
    };
  }

  if (collection === "news") {
    const content = readText(formData, "content");
    const publishedAt = readText(formData, "publishedAt");
    return {
      author: readText(formData, "author"),
      category: parseNewsCategory(readText(formData, "category")),
      content: content ? localizedRichText(plainTextEditorState(content)) : undefined,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      slug: readText(formData, "slug", true),
      title: localized(readText(formData, "title", true)),
    };
  }

  const content = readText(formData, "content");
  return {
    content: content ? localizedRichText(plainTextEditorState(content)) : undefined,
    published: formData.get("published") === "on",
    slug: readText(formData, "slug", true),
    title: localized(readText(formData, "title", true)),
  };
}

export async function saveContentRecord(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const collection = readCollection(formData);
  await requireAdminUser(PANEL_ROUTE_ACCESS[contentRouteMap[collection]]);

  try {
    const payload = await getPayloadClient();
    const id = readText(formData, "id");
    const data = contentData(collection, formData);

    if (id) {
      await payload.update({ collection, data, id });
    } else {
      await payload.create({ collection, data });
    }

    revalidatePath(contentPathMap[collection]);
    revalidatePath("/panel");
    return { message: id ? "İçerik kaydı güncellendi." : "Yeni içerik kaydı oluşturuldu.", success: true };
  } catch {
    return { message: "Kayıt kaydedilemedi. Zorunlu alanları ve benzersiz URL kısa adını kontrol edin.", success: false };
  }
}

export async function deleteContentRecord(formData: FormData) {
  const collection = readCollection(formData);
  const id = readText(formData, "id", true);
  await requireAdminUser(PANEL_ROUTE_ACCESS[contentRouteMap[collection]]);

  const payload = await getPayloadClient();
  await payload.delete({ collection, id });
  revalidatePath(contentPathMap[collection]);
  revalidatePath("/panel");
}

export async function deleteMediaAsset(formData: FormData) {
  const id = readText(formData, "id", true);
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);

  const payload = await getPayloadClient();
  await payload.delete({ collection: "media", id });
  revalidatePath("/panel/icerik/medya");
}
