import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/audit";
import {
  mapEvolutionDeliveryStatus,
  verifyDeliveryEvolutionWebhook,
} from "@/lib/delivery/evolution";
import { claimDeliveryWebhookReplayKey } from "@/lib/delivery/webhook-replay";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

const maximumWebhookBodyBytes = 256 * 1024;

function safeProviderCode(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/[^a-zA-Z0-9_.:-]/g, "")
    .slice(0, 100);
  return normalized || null;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumWebhookBodyBytes
  ) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maximumWebhookBodyBytes) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const verification = verifyDeliveryEvolutionWebhook(rawBody, request.headers);
  if (!verification.valid) {
    const configurationError = verification.reason === "missing_secret";
    return NextResponse.json(
      { ok: false },
      { status: configurationError ? 503 : 401 },
    );
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(rawBody) as Record<string, any>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || Array.isArray(body) || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const expectedInstance =
    process.env.EVOLUTION_INSTANCE_NAME?.trim() || "MizanDernegi";
  const instance = String(
    body.instance || body.instanceName || body.data?.instance || "",
  );
  if (instance && instance !== expectedInstance) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const accepted = await claimDeliveryWebhookReplayKey(verification.replayKey);
  if (!accepted) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const event = String(body.event || body.type || "").toLowerCase();
  const data = body.data || body;
  if (event.includes("connection")) {
    const state = safeProviderCode(
      data?.state || data?.status || data?.instance?.state || "unknown",
    );
    const payload = await getPayloadClient();
    await logAuditEvent(payload, {
      action: "delivery.webhook.connection_update",
      targetCollection: "evolution-instance",
      targetId: expectedInstance,
      details: { state, authentication: verification.method },
    });
    return NextResponse.json({ ok: true });
  }
  const providerMessageId = String(
    data?.key?.id || data?.messageId || data?.id || "",
  ).slice(0, 255);
  if (
    !providerMessageId ||
    (!event.includes("message") && !event.includes("status"))
  ) {
    return NextResponse.json({ ok: true });
  }

  const status = mapEvolutionDeliveryStatus(
    data?.status || data?.update?.status,
  );
  if (!status) return NextResponse.json({ ok: true });

  const payload = await getPayloadClient();
  const api = payload as any;
  const result = await api.find({
    collection: "delivery-messages",
    where: { providerMessageId: { equals: providerMessageId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const message = result.docs[0];
  if (!message) return NextResponse.json({ ok: true });

  const rank: Record<string, number> = {
    sent: 1,
    delivered: 2,
    read: 3,
    manual_sent: 4,
  };
  if (
    (status !== "failed" &&
      (rank[String(message.status)] || 0) >= (rank[status] || 0)) ||
    (status === "failed" &&
      ["delivered", "read", "manual_sent"].includes(String(message.status)))
  ) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const providerErrorCode = safeProviderCode(
    data?.error?.code || data?.errorCode || data?.code,
  );
  await api.update({
    collection: "delivery-messages",
    id: message.id,
    data: {
      status,
      providerStatus: status,
      providerPayload: {
        event: event.slice(0, 100),
        status,
        errorCode: providerErrorCode,
        webhookTimestamp: verification.timestamp,
      },
      deliveredAt:
        status === "delivered" || status === "read"
          ? message.deliveredAt || now
          : message.deliveredAt,
      readAt: status === "read" ? message.readAt || now : message.readAt,
      failedAt: status === "failed" ? now : message.failedAt,
      lastErrorCode:
        status === "failed" ? providerErrorCode || "provider_failed" : null,
      lastError:
        status === "failed"
          ? "WhatsApp sağlayıcısı teslimatı başarısız olarak bildirdi."
          : null,
    },
    overrideAccess: true,
  });
  await logAuditEvent(payload, {
    action: `delivery.webhook.${status}`,
    targetCollection: "delivery-messages",
    targetId: message.id,
    details: {
      providerMessageIdDigest: createHash("sha256")
        .update(providerMessageId)
        .digest("hex"),
      providerErrorCode,
    },
  });
  return NextResponse.json({ ok: true });
}
