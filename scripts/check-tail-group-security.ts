import assert from "node:assert/strict";
import { build } from "esbuild";
const fixture = { role: "admin", calls: 0, limited: false };
(globalThis as unknown as { tailSecurity: typeof fixture }).tailSecurity =
  fixture;
const mocks: Record<string, string> = {
  "server-only": "",
  "next/cache": "export function revalidatePath(){}",
  "@/lib/auth/session":
    "export async function getAdminSession(){return {id:1,email:'fixture@example.invalid',role:globalThis.tailSecurity.role}}",
  "@/lib/rate-limit":
    "export class RateLimitError extends Error{};export async function enforceRateLimit(){if(globalThis.tailSecurity.limited)throw new RateLimitError('Rate limit')}",
  "@/lib/database":
    "export async function withDatabaseTransaction(){globalThis.tailSecurity.calls++;throw new Error('SECRET_CONNECTION_SQL donor_phone')}",
};
const bundled = await build({
  entryPoints: ["lib/admin/tail-group-actions.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "security-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) =>
          mocks[args.path] !== undefined
            ? { path: args.path, namespace: "mock" }
            : undefined,
        );
        builder.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          contents: mocks[args.path],
          loader: "js",
        }));
      },
    },
  ],
});
const actions = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
for (const role of ["", "field_operator", "unknown"]) {
  fixture.role = role;
  assert.equal((await actions.previewTailGroups("1")).success, false);
  assert.equal((await actions.saveTailGroups(new FormData())).success, false);
  assert.equal(fixture.calls, 0);
}
fixture.role = "admin";
assert.equal((await actions.previewTailGroups("1 OR 1=1")).success, false);
assert.equal((await actions.saveTailGroups(new FormData())).success, false);
assert.equal(fixture.calls, 0);
const error = await actions.previewTailGroups("1");
assert.equal(error.success, false);
assert.doesNotMatch(JSON.stringify(error), /SECRET|SQL|donor_phone/);
fixture.calls = 0;
fixture.limited = true;
assert.equal((await actions.previewTailGroups("1")).success, false);
assert.equal(fixture.calls, 0);
console.log(
  "PASS: tail actions require admin before data access, validate ID, hide internal errors, rate limit.",
);
