"use server";

import { revalidatePath } from "next/cache";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";

import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";
import { PAGE_LOCALES, plainTextEditorState } from "@/lib/pages";
import { isManagedSitePageSlug, managedSitePagePath } from "@/lib/site-pages";

export type PageActionState = { message: string | null; success: boolean };
type PageInput = {
  id?: string;
  slug: string;
  published: boolean;
  translations: Record<"tr" | "en" | "ar", { title: string; content: string }>;
};

function parseInput(formData: FormData): PageInput {
  let value: unknown;
  try { value = JSON.parse(String(formData.get("payload") || "")); } catch { throw new Error("Sayfa bilgileri okunamadı."); }
  if (!value || typeof value !== "object") throw new Error("Sayfa bilgileri geçersiz.");
  const source = value as Record<string, unknown>;
  const slug = String(source.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("URL kısalığı yalnızca küçük harf, rakam ve tire içerebilir.");
  const translationsSource = source.translations && typeof source.translations === "object" ? source.translations as Record<string, unknown> : {};
  const translations = Object.fromEntries(PAGE_LOCALES.map((locale) => {
    const item = translationsSource[locale] && typeof translationsSource[locale] === "object" ? translationsSource[locale] as Record<string, unknown> : {};
    return [locale, { title: String(item.title || "").trim(), content: String(item.content || "").trim() }];
  })) as PageInput["translations"];
  if (!translations.tr.title) throw new Error("Türkçe başlık zorunludur.");
  const published = source.published === true;
  for (const locale of PAGE_LOCALES) {
    if (translations[locale].content && !translations[locale].title) throw new Error(`${locale.toUpperCase()} içerik girildiğinde başlık da zorunludur.`);
  }
  if (published && isManagedSitePageSlug(slug)) {
    if (!translations.tr.title || !translations.tr.content) throw new Error("Sistem sayfasını yayınlamak için Türkçe başlık ve içerik zorunludur.");
  } else if (published) {
    for (const locale of PAGE_LOCALES) {
      if (!translations[locale].title || !translations[locale].content) throw new Error(`Yayınlamak için ${locale.toUpperCase()} başlık ve içerik zorunludur.`);
    }
  }
  return { id: source.id ? String(source.id) : undefined, slug, published, translations };
}

export async function savePage(_: PageActionState, formData: FormData): Promise<PageActionState> {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentPages);
  let input: PageInput;
  try { input = parseInput(formData); } catch (error) { return { success: false, message: error instanceof Error ? error.message : "Sayfa doğrulanamadı." }; }
  const payload = await getPayloadClient();
  const req = await createLocalReq({ user: { ...user, collection: "users" } }, payload);
  await initTransaction(req);
  try {
    if (input.id) {
      const existing = await payload.findByID({ collection: "pages", id: input.id, depth: 0, req });
      if (isManagedSitePageSlug(existing.slug) && existing.slug !== input.slug) {
        throw new Error("Sistem sayfasının URL'si değiştirilemez.");
      }
    }
    const tr = input.translations.tr;
    const data = { slug: input.slug, published: input.published, title: tr.title, content: tr.content ? plainTextEditorState(tr.content) : undefined };
    const saved = input.id
      ? await payload.update({ collection: "pages", id: input.id, data, locale: "tr", fallbackLocale: false, req })
      : await payload.create({ collection: "pages", data, locale: "tr", fallbackLocale: false, req });
    const id = String(saved.id);
    for (const locale of ["en", "ar"] as const) {
      const translation = input.translations[locale];
      if (!translation.title && !translation.content) continue;
      await payload.update({ collection: "pages", id, locale, fallbackLocale: false, req, data: {
        title: translation.title,
        content: translation.content ? plainTextEditorState(translation.content, locale === "ar" ? "rtl" : "ltr") : undefined,
      } });
    }
    await commitTransaction(req);
    revalidatePath("/panel/icerik/sayfalar");
    revalidatePath(managedSitePagePath(input.slug));
    revalidatePath("/sitemap.xml");
    return { success: true, message: input.id ? "Sayfa güncellendi." : "Sayfa oluşturuldu." };
  } catch (error) {
    await killTransaction(req);
    const message = error instanceof Error && /unique|duplicate/i.test(error.message) ? "Bu URL kısalığı başka bir sayfada kullanılıyor." : "Sayfa kaydedilemedi.";
    return { success: false, message };
  }
}

export async function deletePage(_: PageActionState, formData: FormData): Promise<PageActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentPages);
  const id = String(formData.get("id") || "");
  if (!id) return { success: false, message: "Sayfa kimliği bulunamadı." };
  try {
    const payload = await getPayloadClient();
    const page = await payload.findByID({ collection: "pages", id, depth: 0 });
    await payload.delete({ collection: "pages", id });
    revalidatePath("/panel/icerik/sayfalar");
    if (page.slug) revalidatePath(managedSitePagePath(page.slug));
    revalidatePath("/sitemap.xml");
    return { success: true, message: "Sayfa silindi." };
  } catch { return { success: false, message: "Sayfa silinemedi." }; }
}
