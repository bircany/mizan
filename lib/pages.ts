import type { AppLocale } from "@/lib/i18n";

export const PAGE_LOCALES = ["tr", "en", "ar"] as const satisfies readonly AppLocale[];

export function lexicalParagraphs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const paragraphs: string[] = [];
  const root = (value as { root?: { children?: unknown[] } }).root;
  for (const child of root?.children || []) {
    if (!child || typeof child !== "object") continue;
    const text: string[] = [];
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const item = node as { children?: unknown[]; text?: unknown };
      if (typeof item.text === "string") text.push(item.text);
      item.children?.forEach(visit);
    };
    visit(child);
    const paragraph = text.join("").trim();
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs;
}

export function plainTextEditorState(text: string, direction: "ltr" | "rtl" = "ltr") {
  const chunks = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  return {
    root: {
      children: chunks.map((paragraph) => ({
        children: [{ detail: 0, format: 0, mode: "normal", style: "", text: paragraph, type: "text", version: 1 }],
        direction,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        type: "paragraph",
        version: 1,
      })),
      direction,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

export function pageExcerpt(paragraphs: string[], length = 160) {
  const value = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  return value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}
