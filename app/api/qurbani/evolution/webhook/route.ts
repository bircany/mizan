import { NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { isValidEvolutionWebhook } from "@/lib/qurbani/evolution";

export async function POST(request: Request) {
  if (!isValidEvolutionWebhook(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, any> | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const event = String(body.event || body.type || "").toLowerCase();
  const data = body.data || body;
  const providerMessageId = String(data?.key?.id || data?.messageId || data?.id || "");
  if (providerMessageId && (event.includes("message") || event.includes("status"))) {
    const payload = await getPayloadClient();
    const result = await payload.find({ collection: "qurbani-messages", where: { providerMessageId: { equals: providerMessageId } }, limit: 1, depth: 0, overrideAccess: true });
    const message = result.docs[0];
    if (message) {
      const rawStatus = String(data?.status || data?.update?.status || "").toLowerCase();
      const next = rawStatus.includes("read") ? "read" : rawStatus.includes("deliver") ? "delivered" : rawStatus.includes("error") || rawStatus.includes("fail") ? "failed" : null;
      if (next) {
        await payload.update({ collection: "qurbani-messages", id: message.id, data: { status: next, deliveredAt: next === "delivered" || next === "read" ? new Date().toISOString() : message.deliveredAt, readAt: next === "read" ? new Date().toISOString() : message.readAt, lastError: next === "failed" ? String(data?.error || "Evolution teslim hatasi.").slice(0, 1000) : message.lastError }, overrideAccess: true });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
