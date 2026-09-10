import assert from "node:assert/strict";
import sharp from "sharp";
import { build } from "esbuild";
import { hasSameOrigin, requiresSameOrigin } from "../lib/security/request-origin";
import { normalizeMediaUpload } from "../lib/security/media-upload";
import { validateManualProof } from "../lib/donations/manual-proof";
import "../lib/security/image-size-policy";
import { imageSize } from "image-size";
import { Users } from "../payload/collections/Users";
import { DeliveryMessages } from "../payload/collections/DeliveryMessages";

assert.throws(() => imageSize(Buffer.from("icns00000000")), /disabled/);
for (const role of ["field_operator", "unknown"]) {
  const args = { req: { user: { id: 1, role } } } as never;
  assert.equal(await Users.access!.unlock!(args), false);
  assert.equal(await DeliveryMessages.access!.read!(args), false);
}
assert.equal(await Users.access!.unlock!({ req: { user: { id: 1, role: "admin", isActive: false } } } as never), false);

for (const origin of [undefined, "null", "https://evil.invalid", "https://panel.invalid.evil.invalid", "invalid"]) {
  assert.equal(hasSameOrigin(new Request("https://panel.invalid/api/delivery/messages/1", { headers: origin ? { origin } : {} })), false);
}
assert.equal(hasSameOrigin(new Request("https://panel.invalid/api/delivery/messages/1", { headers: { origin: "https://panel.invalid" } })), true);
assert.equal(hasSameOrigin(new Request("http://localhost:3000/api", { headers: { host:"127.0.0.1:3000",origin:"http://127.0.0.1:3000" } })), true);
assert.equal(hasSameOrigin(new Request("https://panel.invalid/api", { headers: { host:"panel.invalid", "x-forwarded-host":"evil.invalid",origin:"https://evil.invalid" } })), false);
assert.equal(hasSameOrigin(new Request("https://panel.invalid/api/delivery/messages/1", { headers: { origin: "https://panel.invalid", "sec-fetch-site": "cross-site" } })), false);
for (const path of ["/api/delivery/groups/1/actions", "/api/delivery/messages/1/retry", "/api/delivery/videos/1/review", "/api/delivery/uploads/session", "/api/donations/eft-review/1"]) {
  assert.equal(requiresSameOrigin(path, "POST"), true);
  assert.equal(requiresSameOrigin(path, "GET"), false);
}
assert.equal(requiresSameOrigin("/api/delivery/webhook", "POST"), false);
assert.equal(requiresSameOrigin("/api/delivery/uploads/hooks", "POST"), false);
assert.equal(requiresSameOrigin("/api/delivery/evolution/webhook", "POST"), false);
assert.equal(requiresSameOrigin("/api/donations/eft/1/proof", "POST"), false);
assert.equal(requiresSameOrigin("/api/donations/eft/1/review", "POST"), true);
const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toBuffer();
const valid = { data: png, size: png.length, name: "image.png", mimetype: "image/png" };
const normalized = await normalizeMediaUpload(valid);
assert.equal((await sharp(normalized.data).metadata()).format, "webp");
assert.match(normalized.name, /^[a-f0-9-]+\.webp$/);
for (const file of [
  { ...valid, name: "image.php" }, { ...valid, mimetype: "image/jpeg" },
  { ...valid, data: Buffer.from("<script>SECRET</script>") },
  { ...valid, size: 11 * 1024 * 1024 }, { ...valid, data: Buffer.alloc(0) },
  { ...valid, data: png.subarray(0, 24) },
]) await assert.rejects(normalizeMediaUpload(file));
assert.equal((await validateManualProof(new File([new Uint8Array(png)], "proof.png", { type: "image/png" }))).mime, "image/jpeg");
for (const file of [new File([new Uint8Array(png)], "proof.pdf", {type:"application/pdf"}), new File(["%PDF-broken"], "proof.pdf", {type:"application/pdf"}), new File([new Uint8Array(png)], "proof.exe", {type:"image/png"})]) await assert.rejects(validateManualProof(file));

const state = { role: "field_operator", calls: 0 };
(globalThis as unknown as { phase5: typeof state }).phase5 = state;
const mocks: Record<string,string> = {
  "next/server": "export const NextResponse={json:(b,o)=>Response.json(b,o)}",
  "@/lib/auth/session": "export async function getAdminSession(){const role=globalThis.phase5.role;return role?{id:1,role}:null}",
  "@/lib/payload": "export async function getPayloadClient(){globalThis.phase5.calls++;throw new Error('SECRET SQL PASSWORD')}",
  "@/lib/delivery/messages": "export async function retryDeliveryMessage(){globalThis.phase5.calls++;throw new Error('SECRET SQL PASSWORD')}",
  "@/lib/delivery/access-api": "export class DeliveryAccessApiError extends Error{};export async function deliveryVideoApiRequest(){globalThis.phase5.calls++;throw new Error('SECRET SQL PASSWORD')}",
};
for (const [path, method] of [
  ["app/api/delivery/messages/[messageId]/route.ts", "PATCH"],
  ["app/api/delivery/messages/[messageId]/retry/route.ts", "POST"],
  ["app/api/delivery/groups/[groupId]/actions/route.ts", "POST"],
]) {
  const out = await build({ entryPoints:[path], bundle:true,write:false,platform:"node",format:"esm",plugins:[{name:"isolate",setup(b){b.onResolve({filter:/.*/}, a=>mocks[a.path]!==undefined?{path:a.path,namespace:"mock"}:undefined);b.onLoad({filter:/.*/,namespace:"mock"},a=>({contents:mocks[a.path],loader:"js"}));}}] });
  const route = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
  for (const role of ["", "field_operator", "unknown"]) for (const action of ["prepare", "queue", "pause", "resume", "cancel", "test"]) {
    state.role=role;
    const result=await route[method](new Request("https://panel.invalid",{method,body:JSON.stringify({action,body:"test"})}),{params:Promise.resolve({messageId:"1",groupId:"1"})});
    assert.equal(result.status,403);assert.equal(state.calls,0);
  }
  if (!path.includes("groups")) {
    state.role="admin";
    const result=await route[method](new Request("https://panel.invalid",{method,body:JSON.stringify({body:"test"})}),{params:Promise.resolve({messageId:"1"})});
    assert.doesNotMatch(await result.text(), /SECRET|SQL|PASSWORD/);
    state.calls=0;
  }
}
console.log("PASS Phase5: same-origin, file reencoding/content/extension/size, malformed proofs, all message actions deny field/anonymous, internal error redaction.");
