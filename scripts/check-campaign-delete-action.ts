import assert from "node:assert/strict";
import { build } from "esbuild";

const context = {
  campaign: { confirmedUnits: 0, id: 1, reservedUnits: 0, status: "closed" },
  deletes: 0,
  donations: 0,
  intents: 0,
  reads: 0,
  role: "admin",
};
(globalThis as unknown as { campaignDeleteFixture: typeof context }).campaignDeleteFixture = context;

const mocks: Record<string, string> = {
  "next/cache": "export function revalidatePath() {}",
  "@/lib/admin/data": `export async function requireAdminUser(allowed) {
    const fixture = globalThis.campaignDeleteFixture;
    if (!allowed.includes(fixture.role)) throw new Error("FORBIDDEN");
    return { id: 1, email: "fixture@example.invalid" };
  }`,
  "@/lib/payload": `export async function getPayloadClient() {
    const fixture = globalThis.campaignDeleteFixture;
    fixture.reads += 1;
    return {
      findByID: async () => fixture.campaign,
      find: async ({ collection }) => ({
        docs: [],
        totalDocs: collection === "donations" ? fixture.donations : fixture.intents,
      }),
      delete: async () => { fixture.deletes += 1; },
    };
  }`,
  "@/lib/pages": "export function plainTextEditorState(value) { return value; }",
};

const result = await build({
  entryPoints: ["lib/admin/unified-campaign-actions.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  plugins: [{
    name: "isolated-campaign-delete",
    setup(builder) {
      builder.onResolve(
        { filter: /^(next\/cache|@\/lib\/(admin\/data|payload|pages))$/ },
        (args) => ({ namespace: "delete-fixture", path: args.path }),
      );
      builder.onLoad({ filter: /.*/, namespace: "delete-fixture" }, (args) => ({
        contents: mocks[args.path],
        loader: "js",
      }));
    },
  }],
  write: false,
});

const { deleteUnifiedCampaign } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const initial = { message: null, success: false };
const form = new FormData();
form.set("id", "1");

context.role = "field_operator";
await assert.rejects(deleteUnifiedCampaign(initial, form), /FORBIDDEN/);
assert.equal(context.reads, 0);
assert.equal(context.deletes, 0);

context.role = "admin";
const emptyClosed = await deleteUnifiedCampaign(initial, form);
assert.equal(emptyClosed.success, true);
assert.equal(context.deletes, 1);

for (const blocked of [
  { campaign: { ...context.campaign, confirmedUnits: 1 }, donations: 0, intents: 0 },
  { campaign: { ...context.campaign, reservedUnits: 1 }, donations: 0, intents: 0 },
  { campaign: context.campaign, donations: 1, intents: 0 },
  { campaign: context.campaign, donations: 0, intents: 1 },
]) {
  context.campaign = blocked.campaign;
  context.donations = blocked.donations;
  context.intents = blocked.intents;
  const response = await deleteUnifiedCampaign(initial, form);
  assert.equal(response.success, false);
  assert.equal(context.deletes, 1);
}

console.log("Campaign delete action: closed campaign with 0 activity deleted; 4 activity guards passed.");
