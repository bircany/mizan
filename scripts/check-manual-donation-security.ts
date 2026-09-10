import assert from "node:assert/strict";
import { build } from "esbuild";
const fixture = {role:"field_operator",calls:0,fail:false,limited:false};
(globalThis as unknown as {manualSecurity:typeof fixture}).manualSecurity=fixture;
const mocks:Record<string,string> = {
  "server-only":"",
  "next/cache":"export function revalidatePath(){}",
  "@/lib/auth/session":"export async function getAdminSession(){return {id:1,email:'fixture@example.invalid',role:globalThis.manualSecurity.role}}",
  "@/lib/rate-limit":`export class RateLimitError extends Error{};export async function enforceRateLimit(){if(globalThis.manualSecurity.limited)throw new RateLimitError('Rate limit')}`,
  "@/lib/database":`export async function databaseQuery(){const c=globalThis.manualSecurity;c.calls++;if(c.fail)throw new Error('SECRET_PASSWORD SQL donor_phone');return {rows:[{donor_name:'Fixture donor'}]}};export async function withDatabaseTransaction(){globalThis.manualSecurity.calls++;throw new Error('SECRET_PASSWORD SQL')}`,
  "@/lib/donations/manual-record":"export async function recordManualDonation(){throw new Error('Unexpected')}",
  "@/lib/donations/manual-proof":"export async function validateManualProof(){globalThis.manualSecurity.calls++;throw new Error('Unexpected')}",
  "@/lib/supabase-server":"export function getSupabaseServiceClient(){globalThis.manualSecurity.calls++;throw new Error('Unexpected')}",
};
const result = await build({entryPoints:["lib/admin/manual-donation-actions.ts"],bundle:true,write:false,platform:"node",format:"esm",plugins:[{name:"security-boundaries",setup(builder){
  builder.onResolve({filter:/.*/},args=>mocks[args.path] !== undefined ? {path:args.path,namespace:"mock"} : undefined);
  builder.onLoad({filter:/.*/,namespace:"mock"},args=>({contents:mocks[args.path],loader:"js"}));
}}]});
const actions=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
for(const role of ["", "field_operator", "unknown"]) {
  fixture.role=role;
  for(const request of [()=>actions.saveManualDonation(new FormData()),()=>actions.attachManualProof(new FormData()),()=>actions.findManualDonor("05551234567","TR")]) {
    const response=await request();assert.equal(response.success,false);assert.equal(fixture.calls,0);
  }
}
fixture.role="admin";
assert.equal((await actions.saveManualDonation(new FormData())).success,false);
assert.equal(fixture.calls,0);
assert.equal((await actions.attachManualProof(new FormData())).success,false);
assert.equal(fixture.calls,0);
const lookup=await actions.findManualDonor("05551234567","TR");
assert.deepEqual(Object.keys(lookup).sort(),["name","phone","success"]);
fixture.fail=true;
const failure=await actions.findManualDonor("05551234567","TR");
assert.equal(failure.success,false);assert.doesNotMatch(JSON.stringify(failure),/SECRET|SQL|donor_phone/);
fixture.limited=true;fixture.calls=0;
assert.equal((await actions.findManualDonor("05551234567","TR")).success,false);assert.equal(fixture.calls,0);
console.log("PASS: manual save/lookup/proof deny unauthorized roles before data access, reject malformed input, minimize donor data, hide internal errors, enforce rate limits.");
