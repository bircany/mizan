import "server-only";

import { ensureLocalEnvLoaded, requiredEnv } from "@/lib/env";

export type EvolutionConnectionStatus = {
  state: "connected" | "connecting" | "disconnected" | "unconfigured" | "error";
  instanceName: string;
  qrCodeDataUrl?: string;
  pairingCode?: string;
  phone?: string;
  message?: string;
};

export type EvolutionWebhookStatus = {
  configured: boolean;
  url: string;
  events: string[];
  message: string;
};

const deliveryWebhookUrl =
  "https://www.mizander.com.tr/api/delivery/evolution/webhook";
const deliveryWebhookEvents = [
  "SEND_MESSAGE",
  "MESSAGES_UPDATE",
  "CONNECTION_UPDATE",
] as const;

type JsonRecord = Record<string, unknown>;

class EvolutionHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EvolutionHttpError";
  }
}

function optionalConfig() {
  ensureLocalEnvLoaded();
  const baseUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instanceName =
    process.env.EVOLUTION_INSTANCE_NAME?.trim() || "MizanDernegi";

  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, instanceName };
}

function config() {
  const current = optionalConfig();
  if (current) return current;

  // Keep the existing, explicit missing-variable error for server logs while
  // the panel receives a safe "unconfigured" state from the public helpers.
  requiredEnv("EVOLUTION_API_URL");
  requiredEnv("EVOLUTION_API_KEY");
  throw new Error("Evolution API yapılandırılmadı.");
}

export function isEvolutionConfigured() {
  return Boolean(optionalConfig());
}

function errorText(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (!body || typeof body !== "object") return fallback;

  const record = body as JsonRecord;
  for (const candidate of [record.message, record.error, record.response]) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
    if (Array.isArray(candidate)) {
      const text = candidate
        .filter((item): item is string => typeof item === "string")
        .join(" ")
        .trim();
      if (text) return text;
    }
    if (candidate && typeof candidate === "object") {
      const nested: string = errorText(candidate, "");
      if (nested) return nested;
    }
  }
  return fallback;
}

async function evolutionRequest(path: string, init?: RequestInit) {
  const current = config();
  const response = await fetch(`${current.baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    signal: init?.signal || AbortSignal.timeout(15_000),
    headers: {
      apikey: current.apiKey,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new EvolutionHttpError(
      errorText(body, `Evolution API ${response.status}`),
      response.status,
    );
  }
  return (body && typeof body === "object" ? body : {}) as JsonRecord;
}

function nestedRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" ? (value as JsonRecord) : undefined;
}

function connectionState(value: unknown): EvolutionConnectionStatus["state"] {
  const state = String(value || "").toLowerCase();
  if (["open", "connected"].includes(state)) return "connected";
  if (["connecting", "qr"].includes(state)) return "connecting";
  return "disconnected";
}

function configuredInstanceName() {
  ensureLocalEnvLoaded();
  return process.env.EVOLUTION_INSTANCE_NAME?.trim() || "MizanDernegi";
}

function safeFailure(error: unknown): EvolutionConnectionStatus {
  return {
    state: "error",
    instanceName: configuredInstanceName(),
    message:
      error instanceof Error ? error.message : "Evolution API bağlantı hatası.",
  };
}

async function readConnectionStatus(): Promise<EvolutionConnectionStatus> {
  const current = config();
  const status = await evolutionRequest(
    `/instance/connectionState/${encodeURIComponent(current.instanceName)}`,
  );
  const instance = nestedRecord(status.instance);
  const state = connectionState(instance?.state ?? status.state);
  const owner = instance?.owner ?? status.owner;

  return {
    state,
    instanceName: current.instanceName,
    phone: typeof owner === "string" && owner ? owner : undefined,
    message:
      state === "connected"
        ? "WhatsApp hesabı Evolution API üzerinden bağlı ve mesaj gönderimine hazır."
        : "WhatsApp hesabı bağlı değil. Yeni bir QR kodu oluşturabilirsiniz.",
  };
}

export async function getEvolutionConnectionStatus(): Promise<EvolutionConnectionStatus> {
  if (!isEvolutionConfigured()) {
    return {
      state: "unconfigured",
      instanceName: configuredInstanceName(),
      message: "Evolution API sunucu değişkenleri henüz yapılandırılmadı.",
    };
  }

  try {
    return await readConnectionStatus();
  } catch (error) {
    if (error instanceof EvolutionHttpError && error.status === 404) {
      return {
        state: "disconnected",
        instanceName: configuredInstanceName(),
        message:
          "Evolution instance henüz oluşturulmadı. Bağlan düğmesiyle oluşturabilirsiniz.",
      };
    }
    return safeFailure(error);
  }
}

function qrStatus(
  body: JsonRecord,
  instanceName: string,
): EvolutionConnectionStatus {
  const qrcode = nestedRecord(body.qrcode);
  const rawBase64 = body.base64 ?? qrcode?.base64;
  const base64 = typeof rawBase64 === "string" ? rawBase64.trim() : "";
  const rawPairingCode =
    body.pairingCode ?? body.code ?? qrcode?.pairingCode ?? qrcode?.code;
  const pairingCode =
    typeof rawPairingCode === "string" ? rawPairingCode.trim() : "";

  return {
    state: base64 || pairingCode ? "connecting" : "disconnected",
    instanceName,
    qrCodeDataUrl: base64.startsWith("data:")
      ? base64
      : base64
        ? `data:image/png;base64,${base64}`
        : undefined,
    pairingCode: pairingCode || undefined,
    message:
      base64 || pairingCode
        ? "WhatsApp > Bağlı cihazlar > Cihaz bağla adımlarından QR kodunu tarayın."
        : "Evolution API bağlantı kodu üretmedi. Birkaç saniye sonra yenileyin.",
  };
}

export async function connectEvolutionInstance(): Promise<EvolutionConnectionStatus> {
  if (!isEvolutionConfigured()) return getEvolutionConnectionStatus();
  const current = config();

  try {
    try {
      const currentStatus = await readConnectionStatus();
      if (currentStatus.state === "connected") return currentStatus;
    } catch (error) {
      if (!(error instanceof EvolutionHttpError) || error.status !== 404)
        throw error;
      await evolutionRequest("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: current.instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });
    }

    const qr = await evolutionRequest(
      `/instance/connect/${encodeURIComponent(current.instanceName)}`,
    );
    return qrStatus(qr, current.instanceName);
  } catch (error) {
    return safeFailure(error);
  }
}

export async function disconnectEvolutionInstance() {
  const current = config();
  await evolutionRequest(
    `/instance/logout/${encodeURIComponent(current.instanceName)}`,
    {
      method: "DELETE",
    },
  );
}

function webhookRecord(body: JsonRecord) {
  return nestedRecord(body.webhook) || body;
}

export async function getEvolutionWebhookStatus(): Promise<EvolutionWebhookStatus> {
  ensureLocalEnvLoaded();
  const secret = process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!isEvolutionConfigured() || !secret) {
    return {
      configured: false,
      url: deliveryWebhookUrl,
      events: [...deliveryWebhookEvents],
      message: !secret
        ? "DELIVERY_EVOLUTION_WEBHOOK_SECRET ortam değişkeni eksik."
        : "Evolution API henüz yapılandırılmadı.",
    };
  }

  try {
    const current = config();
    const body = webhookRecord(
      await evolutionRequest(
        `/webhook/find/${encodeURIComponent(current.instanceName)}`,
      ),
    );
    const events = Array.isArray(body.events)
      ? body.events.map(String).map((event) => event.toUpperCase())
      : [];
    const configured =
      body.enabled === true &&
      body.url === deliveryWebhookUrl &&
      deliveryWebhookEvents.every((event) => events.includes(event));
    return {
      configured,
      url: typeof body.url === "string" ? body.url : deliveryWebhookUrl,
      events,
      message: configured
        ? "Teslimat webhook'u etkin ve gerekli olayları dinliyor."
        : "Webhook eksik veya güncel teslimat ayarlarıyla eşleşmiyor.",
    };
  } catch (error) {
    return {
      configured: false,
      url: deliveryWebhookUrl,
      events: [...deliveryWebhookEvents],
      message:
        error instanceof Error
          ? error.message
          : "Webhook durumu doğrulanamadı.",
    };
  }
}

export async function configureEvolutionDeliveryWebhook() {
  ensureLocalEnvLoaded();
  const secret = process.env.DELIVERY_EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("DELIVERY_EVOLUTION_WEBHOOK_SECRET ortam değişkeni eksik.");
  }
  const current = config();
  await evolutionRequest(
    `/webhook/set/${encodeURIComponent(current.instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        // Evolution API 2.3.x validates the configuration under a `webhook`
        // object. Keeping this explicit also prevents silently accepting a
        // request that the provider later ignores.
        webhook: {
          enabled: true,
          url: deliveryWebhookUrl,
          events: [...deliveryWebhookEvents],
          headers: { "x-evolution-webhook-secret": secret },
          byEvents: false,
          base64: false,
        },
      }),
    },
  );
  const verified = await getEvolutionWebhookStatus();
  if (!verified.configured) {
    throw new Error(
      `Webhook kaydedildi ancak doğrulanamadı: ${verified.message}`,
    );
  }
  return verified;
}

export async function sendEvolutionText(phone: string, text: string) {
  const current = config();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15)
    throw new Error("WhatsApp telefon numarası geçersiz.");
  const body = await evolutionRequest(
    `/message/sendText/${encodeURIComponent(current.instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: digits,
        text,
        delay: 600,
        linkPreview: true,
      }),
    },
  );
  const key = nestedRecord(body.key);
  return {
    providerMessageId: String(key?.id || body.messageId || ""),
    response: body,
  };
}

export function isValidEvolutionWebhook(request: Request) {
  ensureLocalEnvLoaded();
  const expected = process.env.QURBANI_EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  return (
    request.headers.get("x-qurbani-webhook-secret") === expected ||
    new URL(request.url).searchParams.get("secret") === expected
  );
}
