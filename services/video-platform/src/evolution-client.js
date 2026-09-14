export class EvolutionError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.name = "EvolutionError";
    this.kind = kind;
    this.status = details.status;
    this.payload = details.payload;
  }
}

function endpoint(base, path, values) {
  let result = path;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, encodeURIComponent(value));
  }
  return `${base}${result.startsWith("/") ? "" : "/"}${result}`;
}

async function request(url, init, config) {
  let response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      headers: {
        apikey: config.evolutionApiKey,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    throw new EvolutionError("ambiguous", "Evolution isteğinin sonucu doğrulanamadı.", {
      payload: { networkError: error instanceof Error ? error.message : String(error) },
    });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || `Evolution HTTP ${response.status}`);
    if ([400, 404, 409, 422].includes(response.status)) {
      throw new EvolutionError("permanent", message, { status: response.status, payload });
    }
    if ([401, 403].includes(response.status) || response.status >= 500) {
      throw new EvolutionError("system", message, { status: response.status, payload });
    }
    throw new EvolutionError("transient", message, { status: response.status, payload });
  }
  return payload;
}

export async function checkEvolutionHealth(config) {
  try {
    const payload = await request(
      endpoint(config.evolutionUrl, config.healthPath, { instance: config.evolutionInstance }),
      { method: "GET" },
      config,
    );
    const state = String(
      payload?.instance?.state ||
      payload?.instance?.connectionStatus ||
      payload?.state ||
      payload?.status ||
      "",
    ).toLowerCase();
    return {
      healthy: ["open", "connected", "online", "ready"].includes(state),
      state: state || "unknown",
    };
  } catch (error) {
    return {
      healthy: false,
      state: error instanceof Error ? error.message : "health-check-failed",
    };
  }
}

export async function sendEvolutionText(phone, text, config) {
  const normalized = String(phone || "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(normalized)) {
    throw new EvolutionError("permanent", "Alıcı telefon numarası geçersiz.");
  }
  const payload = await request(
    endpoint(config.evolutionUrl, "/message/sendText/{instance}", { instance: config.evolutionInstance }),
    {
      method: "POST",
      body: JSON.stringify({
        number: normalized,
        text,
        delay: 600,
        linkPreview: true,
      }),
    },
    config,
  );
  const providerMessageId = String(payload?.key?.id || payload?.messageId || payload?.id || "");
  if (!providerMessageId) {
    throw new EvolutionError("ambiguous", "Evolution yanıtında mesaj kimliği bulunamadı.", { payload });
  }
  return { providerMessageId, payload };
}

export async function sendEvolutionTextWithCopyCode(phone, text, accessCode, config) {
  const normalized = String(phone || "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(normalized)) {
    throw new EvolutionError("permanent", "Alıcı telefon numarası geçersiz.");
  }
  const code = String(accessCode || "").trim();
  if (!/^[A-Z2-9]{8}$/.test(code)) {
    throw new EvolutionError("permanent", "Erişim kodu biçimi geçersiz.");
  }
  try {
    const payload = await request(
      endpoint(config.evolutionUrl, "/message/sendButtons/{instance}", {
        instance: config.evolutionInstance,
      }),
      {
        method: "POST",
        body: JSON.stringify({
          number: normalized,
          title: "Mizan Derneği",
          description: text,
          footer: "Erişim kodunu aşağıdaki düğmeyle kopyalayabilirsiniz.",
          buttons: [
            {
              type: "copy",
              displayText: "Erişim kodunu kopyala",
              copyCode: code,
            },
          ],
          delay: 600,
          linkPreview: true,
        }),
      },
      config,
    );
    const providerMessageId = String(payload?.key?.id || payload?.messageId || payload?.id || "");
    if (!providerMessageId) {
      throw new EvolutionError("ambiguous", "Evolution yanıtında mesaj kimliği bulunamadı.", { payload });
    }
    return { providerMessageId, payload };
  } catch (error) {
    // Some Evolution versions do not expose copy buttons. A clear HTTP
    // capability/validation rejection means no message was accepted, so a
    // plain text fallback is safe. Network ambiguity must never be retried here.
    if (
      error instanceof EvolutionError &&
      [400, 404, 405, 422].includes(Number(error.status))
    ) {
      return sendEvolutionText(normalized, text, config);
    }
    throw error;
  }
}

export async function lookupEvolutionMessage(providerMessageId, config) {
  if (!config.lookupPath) return { supported: false, found: false };
  const payload = await request(
    endpoint(config.evolutionUrl, config.lookupPath, {
      instance: config.evolutionInstance,
      messageId: providerMessageId,
    }),
    { method: "GET" },
    config,
  );
  const serialized = JSON.stringify(payload);
  return {
    supported: true,
    found: serialized.includes(providerMessageId),
    payload,
  };
}
