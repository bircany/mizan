import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export type ContentCollection = "campaigns" | "categories" | "news" | "pages";

export type ContentField = {
  label: string;
  name: string;
  options?: readonly { label: string; value: string }[];
  required?: boolean;
  type: "checkbox" | "number" | "select" | "text" | "textarea";
};

export type ContentDefinition = {
  collection: ContentCollection;
  createLabel: string;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  fields: readonly ContentField[];
  title: string;
};

export type ContentRecord = {
  id: string;
  meta: string;
  title: string;
  values: Record<string, unknown>;
};

export const CONTENT_DEFINITIONS: Record<ContentCollection, ContentDefinition> = {
  campaigns: {
    collection: "campaigns",
    createLabel: "Yeni bağış alanı",
    description: "Bağış alanlarını ve finansal havuzlarını yönetin.",
    emptyDescription: "Yeni bağış alanı oluşturun.",
    emptyTitle: "Bağış alanı bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Kısa açıklama", name: "description", type: "textarea" },
      { label: "Hedef tutar", name: "targetAmount", required: true, type: "number" },
      { label: "Kategori", name: "category", required: true, type: "select" },
      {
        label: "Para birimi",
        name: "currency",
        options: [
          { label: "Türk lirası", value: "TRY" },
          { label: "Amerikan doları", value: "USD" },
          { label: "Euro", value: "EUR" },
          { label: "İngiliz sterlini", value: "GBP" },
        ],
        type: "select",
      },
      {
        label: "Raporlama modu",
        name: "reportingMode",
        options: [
          { label: "Havuz", value: "pool" },
          { label: "Bağış bazlı", value: "donation_based" },
        ],
        type: "select",
      },
      { label: "Bağışa açık", name: "isDonationOpen", type: "checkbox" },
    ],
    title: "Bağış alanları",
  },
  categories: {
    collection: "categories",
    createLabel: "Yeni kategori",
    description: "Bağış ve içerik gruplarının adını, simgesini ve renk bilgisini yönetin.",
    emptyDescription: "Yeni kategori oluşturun.",
    emptyTitle: "Kategori bulunmuyor",
    fields: [
      { label: "Kategori adı", name: "name", required: true, type: "text" },
      { label: "Simge adı", name: "icon", type: "text" },
      { label: "Renk kodu", name: "color", type: "text" },
      { label: "URL kısalığı", name: "slug", required: true, type: "text" },
    ],
    title: "Kategoriler",
  },
  news: {
    collection: "news",
    createLabel: "Yeni haber",
    description: "Haber, duyuru, etkinlik ve proje içeriklerini yayın akışına ekleyin.",
    emptyDescription: "Yeni haber oluşturun.",
    emptyTitle: "Haber bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Metin", name: "content", type: "textarea" },
      {
        label: "Tur",
        name: "category",
        options: [
          { label: "Haber", value: "haber" },
          { label: "Etkinlik", value: "etkinlik" },
          { label: "Duyuru", value: "duyuru" },
          { label: "Proje", value: "proje" },
        ],
        type: "select",
      },
      { label: "Yayın tarihi", name: "publishedAt", type: "text" },
      { label: "Yazar", name: "author", type: "text" },
      { label: "URL kısalığı", name: "slug", required: true, type: "text" },
    ],
    title: "Haberler",
  },
  pages: {
    collection: "pages",
    createLabel: "Yeni sayfa",
    description: "Dernek hakkındaki sayfaların başlık, metin ve yayın durumunu yönetin.",
    emptyDescription: "Yeni sayfa oluşturun.",
    emptyTitle: "Sayfa bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Metin", name: "content", type: "textarea" },
      { label: "URL kısalığı", name: "slug", required: true, type: "text" },
      { label: "Yayında", name: "published", type: "checkbox" },
    ],
    title: "Sayfalar",
  },
};

function localizedText(value: unknown) {
  if (typeof value === "string") {
    let decoded: unknown = value;
    for (let depth = 0; depth < 3 && typeof decoded === "string"; depth += 1) {
      const candidate = decoded.trim();
      if (!candidate.startsWith("{") && !candidate.startsWith('"')) break;
      try {
        decoded = JSON.parse(candidate);
      } catch {
        break;
      }
    }
    if (typeof decoded === "string") return decoded;
    if (decoded && typeof decoded === "object") return localizedText(decoded);
    return "";
  }
  if (value && typeof value === "object" && "tr" in value) {
    const localized = (value as { tr?: unknown }).tr;
    return typeof localized === "string" ? localized : "";
  }

  return "";
}

function lexicalText(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const text: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as { children?: unknown[]; text?: unknown };
    if (typeof record.text === "string") text.push(record.text);
    record.children?.forEach(visit);
  };

  visit(value);
  return text.join("\n").trim();
}

function localizedLexicalText(value: unknown) {
  if (value && typeof value === "object" && "tr" in value) {
    return lexicalText((value as { tr?: unknown }).tr);
  }

  return lexicalText(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function relationValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value) {
    const relationId = (value as { id?: unknown }).id;
    return typeof relationId === "string" || typeof relationId === "number" ? String(relationId) : "";
  }

  return "";
}

function campaignCoverUrl(path: unknown) {
  if (typeof path !== "string" || !path) return "";
  return getSupabaseServiceClient().storage.from("campaign-covers").getPublicUrl(path).data.publicUrl;
}

function localMediaUrl(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const url = (value as { url?: unknown }).url;
  return typeof url === "string" ? url : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown) {
  return value === true;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  return value.slice(0, 16);
}

function updatedMeta(value: unknown) {
  if (typeof value !== "string") return "Son guncelleme bilinmiyor";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Son guncelleme bilinmiyor";
  return `Son guncelleme: ${date.toLocaleDateString("tr-TR")}`;
}

function contentValues(values: ContentRecord["values"]) {
  return values;
}

export async function getContentRecords(collection: ContentCollection): Promise<ContentRecord[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection, depth: 1, limit: 100, sort: "-updatedAt", locale: "all" });
  const fundingPools = collection === "campaigns"
    ? await payload.find({ collection: "campaign-funding-pools", depth: 1, limit: 500, pagination: false, locale: "all" })
    : null;

  return result.docs.map((document) => {
    const record = document as unknown as Record<string, unknown>;
    const id = String(record.id);
    const meta = updatedMeta(record.updatedAt);

    if (collection === "campaigns") {
      const coverImagePath = stringValue(record.coverImagePath);
      const pools = fundingPools?.docs
        .filter((pool) => relationValue((pool as unknown as Record<string, unknown>).campaign) === id)
        .map((pool) => {
          const poolRecord = pool as unknown as Record<string, unknown>;
          const availableLocales = Array.isArray(poolRecord.availableLocales)
            ? poolRecord.availableLocales.filter((locale): locale is "tr" | "en" | "ar" => locale === "tr" || locale === "en" || locale === "ar")
            : ["tr"];
          const hasLocale = (locale: "tr" | "en" | "ar") => availableLocales.includes(locale);
          return {
            currency: stringValue(poolRecord.currency),
            id: String(poolRecord.id),
            isDonationOpen: booleanValue(poolRecord.isDonationOpen),
            reportingMode: stringValue(poolRecord.reportingMode) || "pool",
            targetAmount: numberValue(poolRecord.targetAmount),
            translations: {
              tr: { category: hasLocale("tr") ? relationValue(poolRecord.category && typeof poolRecord.category === "object" ? (poolRecord.category as Record<string, unknown>).tr : null) : "", description: hasLocale("tr") ? localizedLexicalText(poolRecord.description && typeof poolRecord.description === "object" ? (poolRecord.description as Record<string, unknown>).tr : null) : "", title: hasLocale("tr") ? localizedText(poolRecord.title && typeof poolRecord.title === "object" ? (poolRecord.title as Record<string, unknown>).tr : null) : "" },
              en: { category: hasLocale("en") ? relationValue(poolRecord.category && typeof poolRecord.category === "object" ? (poolRecord.category as Record<string, unknown>).en : null) : "", description: hasLocale("en") ? localizedLexicalText(poolRecord.description && typeof poolRecord.description === "object" ? (poolRecord.description as Record<string, unknown>).en : null) : "", title: hasLocale("en") ? localizedText(poolRecord.title && typeof poolRecord.title === "object" ? (poolRecord.title as Record<string, unknown>).en : null) : "" },
              ar: { category: hasLocale("ar") ? relationValue(poolRecord.category && typeof poolRecord.category === "object" ? (poolRecord.category as Record<string, unknown>).ar : null) : "", description: hasLocale("ar") ? localizedLexicalText(poolRecord.description && typeof poolRecord.description === "object" ? (poolRecord.description as Record<string, unknown>).ar : null) : "", title: hasLocale("ar") ? localizedText(poolRecord.title && typeof poolRecord.title === "object" ? (poolRecord.title as Record<string, unknown>).ar : null) : "" },
            },
          };
        }) || [];
      return {
        id,
        meta,
        title: localizedText(record.title) || "Basliksiz bagis alani",
        values: contentValues({
          category: relationValue(record.category),
          currency: stringValue(record.currency) || "TRY",
          description: localizedLexicalText(record.description),
          coverImageAlt: stringValue(record.coverImageAlt) || localizedText(record.title),
          coverImagePath,
          coverImageUrl: localMediaUrl(record.image) || campaignCoverUrl(coverImagePath),
          fundingPools: pools,
          isDonationOpen: booleanValue(record.isDonationOpen),
          reportingMode: stringValue(record.reportingMode) || "pool",
          targetAmount: numberValue(record.targetAmount),
          title: localizedText(record.title),
        }),
      };
    }

    if (collection === "categories") {
      return {
        id,
        meta,
        title: localizedText(record.name) || "Isimsiz kategori",
        values: contentValues({
          color: stringValue(record.color),
          icon: stringValue(record.icon),
          name: localizedText(record.name),
          slug: stringValue(record.slug),
        }),
      };
    }

    if (collection === "news") {
      return {
        id,
        meta,
        title: localizedText(record.title) || "Basliksiz haber",
        values: contentValues({
          author: stringValue(record.author),
          category: stringValue(record.category) || "haber",
          content: localizedLexicalText(record.content),
          publishedAt: dateValue(record.publishedAt),
          slug: stringValue(record.slug),
          title: localizedText(record.title),
        }),
      };
    }

    return {
      id,
      meta,
      title: localizedText(record.title) || "Basliksiz sayfa",
      values: contentValues({
        content: localizedLexicalText(record.content),
        published: booleanValue(record.published),
        slug: stringValue(record.slug),
        title: localizedText(record.title),
      }),
    };
  });
}
