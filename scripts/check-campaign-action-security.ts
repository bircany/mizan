import assert from "node:assert/strict";
import { build } from "esbuild";

// Execute the real server action with isolated authentication/database boundaries.
// No application environment or remote database is loaded by this script.
const context = { role: "admin", reads: 0, writes: 0, fail: false };
(globalThis as unknown as { campaignSecurityFixture: typeof context }).campaignSecurityFixture = context;
const mocks: Record<string, string> = {
  "next/cache": "export function revalidatePath() {}",
  "@/lib/admin/data": `export async function requireAdminUser(allowed) {
    const c = globalThis.campaignSecurityFixture;
    if (!allowed.includes(c.role)) throw new Error('FORBIDDEN');
    return {id: 1, email:'fixture@example.invalid'};
  }`,
  "@/lib/payload": `export async function getPayloadClient() {
    const c = globalThis.campaignSecurityFixture;
    c.reads++;
    if(c.fail) throw new Error('postgresql://PRIVATE_SECRET@internal-db SQL users donor-phone');
    return {
      find: async () => ({docs:[],totalDocs:0}),
      findByID: async () => ({id:1,slug:'test',status:'draft'}),
      create: async () => {c.writes++;return {id:1}},
      update: async () => {c.writes++;return {id:1}}
    };
  }`,
  "@/lib/pages": "export function plainTextEditorState(value) {return value}",
};
const result = await build({
  entryPoints: ["lib/admin/unified-campaign-actions.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{name: "isolated-security-boundaries", setup(builder) {
    builder.onResolve({filter: /^(next\/cache|@\/lib\/(admin\/data|payload|pages))$/}, (args) => ({path:args.path,namespace:"security-fixture"}));
    builder.onLoad({filter:/.*/,namespace:"security-fixture"}, (args) => ({contents:mocks[args.path],loader:"js"}));
  }}],
});
const { saveUnifiedCampaign } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key,value] of Object.entries({
    title:"Fixture",category:"1",currency:"TRY",pricingModel:"fixed",unitPrice:"2000",
    totalStock:"102",videoDelivery:"video",operationType:"standard_video",groupCapacity:"6",
    status:"active",saveIntent:"publish",...overrides,
  })) data.set(key,value);
  return data;
}
const initial = {success:false,message:null};
for (const role of ["field_operator", "", "unknown"]) {
  context.role = role;
  await assert.rejects(saveUnifiedCampaign(initial, form()), /FORBIDDEN/);
  assert.equal(context.reads,0);
  assert.equal(context.writes,0);
}
context.role = "admin";
const invalidForms: Array<Record<string, string>> = [
  {saveIntent:""}, {status:""}, {saveIntent:"draft"}, {unitPrice:"-1"},
  {unitPrice:"Infinity"}, {groupCapacity:"1.5"}, {pricingModel:"invalid"},
  {videoDelivery:""}, {operationType:"invalid"}, {title:""},
  {totalStock:"100"}, {totalStock:"100",roundedStockConfirmed:"105"},
];
for (const overrides of invalidForms) {
  const response = await saveUnifiedCampaign(initial, form(overrides));
  assert.equal(response.success,false);
  assert.equal(context.writes,0);
}
context.fail = true;
const failure = await saveUnifiedCampaign(initial, form());
assert.equal(failure.success,false);
assert.doesNotMatch(JSON.stringify(failure), /PRIVATE_SECRET|postgresql|internal-db|donor-phone|SQL/);
context.fail = false;
assert.equal((await saveUnifiedCampaign(initial, form())).success,true);
assert.equal(context.writes,1);
assert.equal((await saveUnifiedCampaign(initial, form({saveIntent:"draft",status:"draft"}))).success,true);
assert.equal(context.writes,2);
assert.equal((await saveUnifiedCampaign(initial, form({totalStock:"100",roundedStockConfirmed:"102"}))).success,true);
assert.equal(context.writes,3);
console.log("Campaign server-action security: 19 scenarios passed; all writes isolated in memory (including rounding confirmation).");
