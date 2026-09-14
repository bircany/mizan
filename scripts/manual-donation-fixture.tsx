import { build } from "esbuild";
import { createServer } from "node:http";
const result = await build({stdin:{contents:`
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {ManualDonationForm} from './components/admin/manual-donation-form';
  window.manualCalls=[];
  createRoot(document.getElementById('root')).render(<ManualDonationForm campaigns={[
    {id:'1',title:'Test Kurban',status:'active',currency:'TRY',pricingModel:'fixed',unitPrice:2000,videoDelivery:'video',operationType:'standard_video'},
    {id:'2',title:'Test Serbest',status:'active',currency:'TRY',pricingModel:'free',videoDelivery:'none'},
    {id:'3',title:'Gizli Kurban',status:'draft',currency:'TRY',pricingModel:'fixed',unitPrice:2000,videoDelivery:'video',operationType:'standard_video'},
    {id:'4',title:'Arşiv Kurban',status:'archived',currency:'TRY',pricingModel:'fixed',unitPrice:2000,videoDelivery:'video',operationType:'standard_video'}
  ]}/>);
`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",platform:"browser",plugins:[{name:"isolated-manual-actions",setup(builder){
  builder.onResolve({filter:/^@\/lib\/admin\/manual-donation-actions$/},()=>({path:"actions",namespace:"fixture"}));
  builder.onLoad({filter:/.*/,namespace:"fixture"},()=>({loader:"js",contents:`
    export async function findManualDonor(){await new Promise(r=>setTimeout(r,50));return {success:true,name:'Kayıtlı Bağışçı',phone:'+905551234567'}}
    export async function saveManualDonation(data){window.manualCalls.push(Object.fromEntries(data));await new Promise(r=>setTimeout(r,100));return {success:true,id:1,receipt:'TEST-ONLY',message:'Bağış kaydedildi.'}}
    export async function attachManualProof(){return {success:false,message:'Test: dekont yüklenemedi'}}
  `}));
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:"navigation",namespace:"navigation-fixture"}));
  builder.onLoad({filter:/.*/,namespace:"navigation-fixture"},()=>({contents:"export function useRouter(){return {refresh(){}}}",loader:"js"}));
}}]});
createServer((req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.url === "/fixture.js"){res.setHeader("Content-Type","text/javascript");res.end(result.outputFiles[0].text);return;}
  res.setHeader("Content-Type","text/html");res.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manual donation isolated fixture</title><style>body{font-family:system-ui;color:#203129;background:#f4f6f4}dialog{width:min(720px,90vw);border:1px solid #ccc;border-radius:16px}dialog::backdrop{background:#0006}form{max-height:75vh;overflow:auto}label{display:block;margin:12px 0}input,select,textarea,button{box-sizing:border-box;padding:10px;margin:4px;max-width:100%}fieldset{border:0}input:not([type=checkbox]),select,textarea{display:block;width:94%}button{cursor:pointer}button:disabled{opacity:.5}p{padding:8px}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`);
}).listen(4320,"127.0.0.1",()=>console.log("Manual donation isolated fixture: http://127.0.0.1:4320"));
