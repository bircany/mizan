import { getPayloadClient } from "@/lib/payload";

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
  values: Record<string, boolean | number | string>;
};

export const CONTENT_DEFINITIONS: Record<ContentCollection, ContentDefinition> = {
  campaigns: {
    collection: "campaigns",
    createLabel: "Yeni bağış alanı",
    description: "Bağış alanlarının temel bilgilerini, hedef tutarını ve yayın durumunu yönetin.",
    emptyDescription: "Yeni bağış alanı oluşturduğunuzda burada listelenecek.",
    emptyTitle: "Bağış alanı bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Kısa açıklama", name: "description", type: "textarea" },
      { label: "Kod", name: "code", required: true, type: "text" },
      { label: "URL kısa adı", name: "slug", required: true, type: "text" },
      { label: "Hedef tutar", name: "targetAmount", required: true, type: "number" },
      {
        label: "Para birimi",
        name: "currency",
        options: [
          { label: "Türk lirası", value: "TRY" },
          { label: "Amerikan doları", value: "USD" },
          { label: "Avro", value: "EUR" },
          { label: "İngiliz sterlini", value: "GBP" },
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
    description: "Kampanya ve içerik gruplarının adını, simgesini ve renk bilgisini yönetin.",
    emptyDescription: "Yeni kategori oluşturduğunuzda burada listelenecek.",
    emptyTitle: "Kategori bulunmuyor",
    fields: [
      { label: "Kategori adı", name: "name", required: true, type: "text" },
      { label: "Simge adı", name: "icon", type: "text" },
      { label: "Renk kodu", name: "color", type: "text" },
      { label: "URL kısa adı", name: "slug", required: true, type: "text" },
    ],
    title: "Kategoriler",
  },
  news: {
    collection: "news",
    createLabel: "Yeni haber",
    description: "Haber, duyuru, etkinlik ve proje içeriklerini yayın akışına ekleyin.",
    emptyDescription: "Yeni haber oluşturduğunuzda burada listelenecek.",
    emptyTitle: "Haber bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Metin", name: "content", type: "textarea" },
      {
        label: "Tür",
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
      { label: "URL kısa adı", name: "slug", required: true, type: "text" },
    ],
    title: "Haberler",
  },
  pages: {
    collection: "pages",
    createLabel: "Yeni sayfa",
    description: "Dernek hakkındaki statik sayfaların başlık, metin ve yayın durumunu yönetin.",
    emptyDescription: "Yeni sayfa oluşturduğunuzda burada listelenecek.",
    emptyTitle: "Sayfa bulunmuyor",
    fields: [
      { label: "Başlık", name: "title", required: true, type: "text" },
      { label: "Metin", name: "content", type: "textarea" },
      { label: "URL kısa adı", name: "slug", required: true, type: "text" },
      { label: "Yayında", name: "published", type: "checkbox" },
    ],
    title: "Sayfalar",
  },
};

function localizedText(value: unknown) {
  if (typeof value === "string") return value;
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
  if (typeof value !== "string") return "Son güncelleme bilinmiyor";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Son güncelleme bilinmiyor";
  return `Son güncelleme: ${date.toLocaleDateString("tr-TR")}`;
}

function contentValues(values: ContentRecord["values"]) {
  return values;
}

export async function getContentRecords(collection: ContentCollection): Promise<ContentRecord[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection, limit: 100, sort: "-updatedAt" });

  return result.docs.map((document) => {
    const record = document as unknown as Record<string, unknown>;
    const id = String(record.id);
    const meta = updatedMeta(record.updatedAt);

    if (collection === "campaigns") {
      return {
        id,
        meta,
        title: localizedText(record.title) || "Başlıksız bağış alanı",
        values: contentValues({
          code: stringValue(record.code),
          currency: stringValue(record.currency) || "TRY",
          description: localizedLexicalText(record.description),
          isDonationOpen: booleanValue(record.isDonationOpen),
          slug: stringValue(record.slug),
          targetAmount: numberValue(record.targetAmount),
          title: localizedText(record.title),
        }),
      };
    }

    if (collection === "categories") {
      return {
        id,
        meta,
        title: localizedText(record.name) || "Adsız kategori",
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
        title: localizedText(record.title) || "Başlıksız haber",
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
      title: localizedText(record.title) || "Başlıksız sayfa",
      values: contentValues({
        content: localizedLexicalText(record.content),
        published: booleanValue(record.published),
        slug: stringValue(record.slug),
        title: localizedText(record.title),
      }),
    };
  });
}
