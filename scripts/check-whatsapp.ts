import assert from "node:assert/strict";

process.env.EVOLUTION_API_URL = "https://evolution.example.test";
process.env.EVOLUTION_API_KEY = "test-api-key";
process.env.EVOLUTION_INSTANCE_NAME = "MizanDernegi";

const responses: Array<{ status: number; body: unknown }> = [];
const calls: Array<{ url: string; method: string; body?: string }> = [];

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const next = responses.shift();
  assert.ok(next, "Unexpected Evolution API call");
  calls.push({
    url: String(input),
    method: init?.method || "GET",
    body: typeof init?.body === "string" ? init.body : undefined,
  });
  return new Response(JSON.stringify(next.body), {
    status: next.status,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

const {
  connectEvolutionInstance,
  getEvolutionConnectionStatus,
} = await import("../lib/qurbani/evolution");

responses.push({ status: 200, body: { instance: { state: "open", owner: "905000000000" } } });
const connected = await getEvolutionConnectionStatus();
assert.equal(connected.state, "connected");
assert.equal(connected.phone, "905000000000");
assert.equal(calls[0].url, "https://evolution.example.test/instance/connectionState/MizanDernegi");

responses.push(
  { status: 404, body: { message: "Instance not found" } },
  { status: 201, body: { instance: { instanceName: "MizanDernegi" } } },
  { status: 200, body: { base64: "cXItY29kZQ==", pairingCode: "1234-5678" } },
);
const connecting = await connectEvolutionInstance();
assert.equal(connecting.state, "connecting");
assert.equal(connecting.qrCodeDataUrl, "data:image/png;base64,cXItY29kZQ==");
assert.equal(connecting.pairingCode, "1234-5678");
assert.equal(calls[2].method, "POST");
assert.deepEqual(JSON.parse(calls[2].body || "{}"), {
  instanceName: "MizanDernegi",
  integration: "WHATSAPP-BAILEYS",
  qrcode: true,
});
assert.equal(calls[3].url, "https://evolution.example.test/instance/connect/MizanDernegi");

responses.push({ status: 401, body: { response: { message: ["Invalid API key"] } } });
const failed = await getEvolutionConnectionStatus();
assert.equal(failed.state, "error");
assert.equal(failed.message, "Invalid API key");

console.log("WhatsApp Evolution connection checks passed.");
