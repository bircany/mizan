export const DEFAULT_DELIVERY_MESSAGE_BODY =
  "Bağışınıza ait videonuz hazırlanmıştır. Rabbim hayrınızı kabul etsin.";

export const DELIVERY_TEMPLATE_TOKENS = [
  "{ad}",
  "{kampanya}",
  "{grup_kodu}",
  "{video_linki}",
  "{erisim_kodu}",
] as const;

const externalLinkPattern =
  /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|tr|app|cloud)\b)/i;

export function sanitizeEditableDeliveryMessage(value: unknown) {
  const source = typeof value === "string" ? value : "";
  return source
    .replace(/\{\{[^{}]{0,80}\}\}|\{[^{}]{0,80}\}/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 600);
}

export function validateEditableDeliveryMessage(value: unknown) {
  const source = typeof value === "string" ? value.trim() : "";
  if (externalLinkPattern.test(source)) {
    throw new Error(
      "Açıklama alanına bağlantı eklenemez; güvenli video bağlantısı sistem tarafından eklenir.",
    );
  }
  const sanitized = sanitizeEditableDeliveryMessage(source);
  if (!sanitized) {
    throw new Error("Mesaj açıklaması boş bırakılamaz.");
  }
  return sanitized;
}

export function buildProtectedDeliveryTemplate(value: unknown) {
  const body =
    sanitizeEditableDeliveryMessage(value) || DEFAULT_DELIVERY_MESSAGE_BODY;
  return [
    "Sayın {ad},",
    "",
    body,
    "",
    "Kampanya: {kampanya}",
    "Grup kodu: {grup_kodu}",
    "Video bağlantısı: {video_linki}",
    "Erişim kodu: {erisim_kodu}",
  ].join("\n");
}

export function extractEditableDeliveryMessage(template: unknown) {
  if (typeof template !== "string" || !template.trim()) {
    return DEFAULT_DELIVERY_MESSAGE_BODY;
  }
  const canonical = template.match(
    /^Sayın \{ad\},\n\n([\s\S]*?)\n\nKampanya: \{kampanya\}\nGrup kodu: \{grup_kodu\}\nVideo bağlantısı: \{video_linki\}(?:\nErişim kodu: \{erisim_kodu\})?$/,
  );
  if (canonical?.[1]) return sanitizeEditableDeliveryMessage(canonical[1]);
  return sanitizeEditableDeliveryMessage(template) || DEFAULT_DELIVERY_MESSAGE_BODY;
}
