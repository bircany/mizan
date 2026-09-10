/** Real list component; operation/upload controls stubbed, no production services. */
import { build } from "esbuild";
import { createServer } from "node:http";
const result = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "tsx",
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {UnifiedVideoDelivery} from './components/admin/unified-video-delivery';
import {parseVideoFilters,videoTabs} from './lib/admin/video-filters';
const p=Object.fromEntries(new URLSearchParams(location.search));
const rows=Array.from({length:30},(_,i)=>({id:String(i),groupId:String(i),groupCode:'MD-2026-'+String(i+1).padStart(4,'0'),campaign:i%2?'Su Kuyusu':'Afrika Kurban',campaignId:i%2?'2':'1',category:i%2?'Su':'Kurban',categoryId:i%2?'20':'10',status:i===1?'failed':'video_pending',videoStatus:i===1?'failed':'waiting',messageId:null,messageBody:'',recipient:'1 alıcı',recipients:[{id:'p'+i,name:'Test Hissedar '+i,maskedPhone:'+90 *** ** 67',unitIndex:1,status:'confirmed'}],updatedAt:'2026-09-09T22:00:00Z'}));
createRoot(document.getElementById('root')).render(<UnifiedVideoDelivery rows={rows} tab={videoTabs.includes(p.tab)?p.tab:'all'} filters={parseVideoFilters(p)} canManage={false}/>);
`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  jsx: "automatic",
  plugins: [
    {
      name: "isolated",
      setup(b) {
        const mocks: Record<string, string> = {
          "next/link":
            "import React from 'react';export default function Link({href,children,scroll,...props}){return <a href={href} {...props}>{children}</a>}",
          "@/components/admin/delivery-panel-auto-refresh":
            "export function DeliveryPanelAutoRefresh(){return null}",
          "@/components/admin/delivery-operation-modal":
            "export function DeliveryOperationModal(){return <button type='button'>Detay</button>}",
          "@/components/admin/delivery-row-actions":
            "export function DeliveryRowActions(){return <button type='button'>Video yükle (test)</button>}",
        };
        b.onResolve({ filter: /.*/ }, (a) =>
          mocks[a.path] !== undefined
            ? { path: a.path, namespace: "mock" }
            : undefined,
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents: mocks[a.path],
          loader: "tsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
createServer((req, res) => {
  if (req.url === "/fixture.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(result.outputFiles[0].text);
    return;
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Video panel fixture</title><style>body{font:15px system-ui;padding:16px;color:#203428;background:#f6f7f6}form{display:grid;gap:12px}label{display:block}label span{display:block}input,select,button,a{font:inherit;padding:8px}input,select{box-sizing:border-box;width:100%}nav{display:flex;gap:8px;overflow:auto;margin:18px 0}a{color:#236443;white-space:nowrap}table{border-collapse:collapse;min-width:820px;width:100%}td,th{padding:16px;text-align:left;border-bottom:1px solid #ccc}.overflow-x-auto{overflow:auto}.grid{display:grid;gap:16px}.p-5{padding:20px;border:1px solid #ccc;border-radius:12px;background:white}details ul{padding:12px}button{margin:4px}@media(min-width:768px){form{grid-template-columns:repeat(4,1fr)}.md\\:grid-cols-2{grid-template-columns:repeat(2,1fr)}}@media(min-width:1200px){.xl\\:grid-cols-3{grid-template-columns:repeat(3,1fr)}}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`,
  );
}).listen(4322, "127.0.0.1", () =>
  console.log("Video list fixture: http://127.0.0.1:4322"),
);
