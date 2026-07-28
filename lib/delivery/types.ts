export type DeliveryMessageStatus =
  | "draft"
  | "queued"
  | "paused"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled";

export type DeliveryVideoStatus =
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "superseded"
  | "rejected"
  | "failed";

export type DeliveryActor = {
  id: string;
  email?: string;
};

export function relationId(value: unknown): string {
  if (typeof value === "object" && value && "id" in value) {
    return String((value as { id: string | number }).id);
  }
  return String(value ?? "");
}

export function normalizePhone(value: unknown): string | null {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = `90${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function interpolateDeliveryTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g,
    (placeholder, doubleBraceKey: string | undefined, singleBraceKey: string | undefined) => {
      const key = doubleBraceKey || singleBraceKey || "";
      return Object.hasOwn(values, key) ? values[key] : placeholder;
    },
  );
}
