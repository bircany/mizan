import assert from "node:assert/strict";
import { build } from "esbuild";
const state = { valid: true, public: false, calls: 0, uploads: 0, updates: 0, active: true, fail: false };
(globalThis as unknown as { eftTest: typeof state }).eftTest=state;
const mocks:Record<string,string>={
  "next/server":"export const NextResponse={json:(b,o)=>Response.json(b,o)}",
  "@/lib/donations/eft-authorization":"export function verifyEftUploadToken(){return globalThis.eftTest.valid?{sessionId:1}:null}",
  "@/lib/rate-limit":"export class RateLimitError extends Error{};export async function enforceRateLimit(){}",
  "@/lib/donations/manual-proof":"export async function validateManualProof(file){if(!(file instanceof File))throw Error('invalid');return {bytes:new Uint8Array([1]),mime:'image/jpeg',extension:'jpg'}}",
  "@/lib/database":`export async function withDatabaseTransaction(fn){const s=globalThis.eftTest;s.calls++;return fn({query:async sql=>{if(sql.startsWith('select'))return {rows:[{donation_intent_id:1,payment_method:'bank_transfer',provider_status:s.active?'EFT_PROOF_PENDING':'EFT_REVIEW_PENDING',reservation_expires_at:new Date(Date.now()+60000)}]};if(s.fail)throw Error('SECRET SQL PASSWORD');s.updates++;return {rows:[]};}})}`,
  "@/lib/supabase-server":`export function getSupabaseServiceClient(){return {storage:{getBucket:async()=>({data:{public:globalThis.eftTest.public}}),from:()=>({upload:async()=>{globalThis.eftTest.uploads++;return {}},remove:()=>{throw Error('Must not delete on uncertain commit')}})}}}`,
};
const result=await build({entryPoints:["app/api/donations/eft/[id]/proof/route.ts"],bundle:true,write:false,platform:"node",format:"esm",plugins:[{name:"mock",setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]!==undefined?{path:a.path,namespace:"mock"}:undefined);b.onLoad({filter:/.*/,namespace:"mock"},a=>({contents:mocks[a.path],loader:"js"}));}}]});
const {POST}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
async function send(big=false){const form=new FormData();form.set("file",new File([big?new Uint8Array(12*1024*1024):"test"],"proof.jpg",{type:"image/jpeg"}));const encoded=new Response(form);const bytes=await encoded.arrayBuffer();return POST(new Request("http://local/api/donations/eft/1/proof",{method:"POST",headers:{authorization:"Bearer fixture","content-type":encoded.headers.get("content-type")!},body:bytes}),{params:Promise.resolve({id:"1"})});}
state.valid=false;assert.equal((await send()).status,403);assert.equal(state.calls,0);
state.valid=true;assert.equal((await send(true)).status,413);assert.equal(state.calls,0);
state.public=true;assert.equal((await send()).status,400);assert.equal(state.uploads,0);
state.public=false;state.active=false;assert.equal((await send()).status,400);assert.equal(state.uploads,0);
state.active=true;assert.equal((await send()).status,200);assert.equal(state.updates,2);
state.fail=true;const failed=await send();assert.equal(failed.status,400);assert.doesNotMatch(await failed.text(),/SECRET|SQL|PASSWORD/);
console.log("PASS EFT route: token gate, bounded multipart, private bucket, replay-state guard, transactional references and error redaction; storage/DB isolated.");
