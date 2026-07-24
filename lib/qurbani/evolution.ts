import "server-only";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

export type EvolutionConnectionStatus = {
  state: "connected" | "connecting" | "disconnected" | "error";
  instanceName: string;
  qrCodeDataUrl?: string;
  phone?: string;
  message?: string;
};

class EvolutionHttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function config() {
  ensureLocalEnvLoaded();
  return {
    baseUrl: requiredEnv("EVOLUTION_API_URL").replace(/\/$/, ""),
    apiKey: requiredEnv("EVOLUTION_API_KEY"),
    instanceName: process.env.EVOLUTION_INSTANCE_NAME?.trim() || "mizan-kurban",
  };
}

async function evolutionRequest(path: string, init?: RequestInit) {
  const current = config();
  const response = await fetch(`${current.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: current.apiKey,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new EvolutionHttpError(String(body?.message || body?.error || `Evolution API ${response.status}`), response.status);
  }
  return body as Record<string, any>;
}

function connectionState(value: unknown): EvolutionConnectionStatus["state"] {
  const state = String(value || "").toLowerCase();
  if (["open", "connected"].includes(state)) return "connected";
  if (["connecting", "qr"].includes(state)) return "connecting";
  return "disconnected";
}

export async function getEvolutionConnectionStatus(): Promise<EvolutionConnectionStatus> {
  const current = config();
  try {
    let status: Record<string, any>;
    try {
      status = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(current.instanceName)}`);
    } catch (error) {
      if (!(error instanceof EvolutionHttpError) || error.status !== 404) throw error;
      const webhookSecret = process.env.QURBANI_EVOLUTION_WEBHOOK_SECRET?.trim();
      const webhookUrl = `${(process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/qurbani/evolution/webhook${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;
      await evolutionRequest("/instance/create", { method: "POST", body: JSON.stringify({ instanceName: current.instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true, webhook: webhookUrl.startsWith("http") ? { url: webhookUrl, byEvents: false, base64: false, events: ["CONNECTION_UPDATE", "MESSAGES_UPDATE"] } : undefined }) });
      status = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(current.instanceName)}`);
    }
    const state = connectionState(status?.instance?.state || status?.state);
    if (state === "connected") {
      return {
        state,
        instanceName: current.instanceName,
        phone: String(status?.instance?.owner || status?.owner || "") || undefined,
      };
    }

    const qr = await evolutionRequest(`/instance/connect/${encodeURIComponent(current.instanceName)}`);
    const base64 = String(qr?.base64 || qr?.qrcode?.base64 || "");
    return {
      state: base64 ? "connecting" : "disconnected",
      instanceName: current.instanceName,
      qrCodeDataUrl: base64.startsWith("data:") ? base64 : base64 ? `data:image/png;base64,${base64}` : undefined,
      message: base64 ? "WhatsApp uygulamasiyla QR kodu tarayin." : "Evolution instance baglantisi bekleniyor.",
    };
  } catch (error) {
    return {
      state: "error",
      instanceName: current.instanceName,
      message: error instanceof Error ? error.message : "Evolution API baglanti hatasi.",
    };
  }
}

export async function disconnectEvolutionInstance() {
  const current = config();
  await evolutionRequest(`/instance/logout/${encodeURIComponent(current.instanceName)}`, { method: "DELETE" });
}

export async function sendEvolutionText(phone: string, text: string) {
  const current = config();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("WhatsApp telefon numarasi gecersiz.");
  const body = await evolutionRequest(`/message/sendText/${encodeURIComponent(current.instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ number: digits, text, delay: 600, linkPreview: true }),
  });
  return {
    providerMessageId: String(body?.key?.id || body?.messageId || ""),
    response: body,
  };
}

export function isValidEvolutionWebhook(request: Request) {
  ensureLocalEnvLoaded();
  const expected = process.env.QURBANI_EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-qurbani-webhook-secret") === expected || new URL(request.url).searchParams.get("secret") === expected;
}
