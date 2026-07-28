import { getPayloadClient } from "@/lib/payload";

export type ContactMessageRecord = {
  id: string;
  type: "contact" | "student";
  name: string;
  email: string;
  phone: string;
  subject: string;
  program: string;
  message: string;
  status: "unread" | "read" | "archived";
  createdAt: string;
  readAt: string;
};

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }

export function toContactMessage(value: unknown): ContactMessageRecord {
  const item = record(value);
  const status = item.status === "read" || item.status === "archived" ? item.status : "unread";
  return { id: String(item.id), type: item.type === "student" ? "student" : "contact", name: text(item.name), email: text(item.email), phone: text(item.phone), subject: text(item.subject), program: text(item.program), message: text(item.message), status, createdAt: text(item.createdAt), readAt: text(item.readAt) };
}

export async function getContactMessages(page = 1, limit = 12) {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "contact-messages" as never, depth: 0, page: Math.max(1, page), limit, pagination: true, sort: ["status", "-createdAt"], overrideAccess: true } as never) as unknown as { docs: unknown[]; page: number; totalPages: number; totalDocs: number };
  return { messages: result.docs.map(toContactMessage), page: result.page, totalPages: result.totalPages, totalDocs: result.totalDocs };
}

export async function getContactMessage(id: string) {
  const payload = await getPayloadClient();
  const item = await payload.findByID({ collection: "contact-messages" as never, id, depth: 0, overrideAccess: true } as never);
  return toContactMessage(item);
}

export async function getLatestUnreadContactMessage() {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "contact-messages" as never, depth: 0, limit: 1, pagination: false, sort: "-createdAt", where: { status: { equals: "unread" } }, overrideAccess: true } as never) as unknown as { docs: unknown[] };
  return result.docs[0] ? toContactMessage(result.docs[0]) : null;
}
