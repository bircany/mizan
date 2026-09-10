/** Real client component; mock actions, no application env or credentials. */
import { build } from "esbuild";
import { createServer } from "node:http";
const result = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {TailGroupEditor} from './components/admin/tail-group-editor';window.tailSaves=[];createRoot(document.getElementById('root')).render(<TailGroupEditor campaignId="1"/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  jsx: "automatic",
  platform: "browser",
  plugins: [
    {
      name: "no-server",
      setup(builder) {
        builder.onResolve(
          { filter: /^@\/lib\/admin\/tail-group-actions$/ },
          (args) => ({ path: args.path, namespace: "fixture" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          loader: "js",
          contents: `
    export async function previewTailGroups(){return {success:true,data:{campaignId:1,currency:'TRY',maximum:6,minimum:2,operationType:'slaughter_video',version:'test-version',groups:[{id:10,code:'MD-2026-0010',capacity:6,count:6,priceCents:200000,updatedAt:'2026-09-10'},{id:11,code:'MD-2026-0011',capacity:6,count:1,priceCents:200000,updatedAt:'2026-09-10'}],members:Array.from({length:7},(_,i)=>({id:i+1,groupId:i<6?10:11,name:'Test Katılımcı '+(i+1),receivedCents:200000}))}}}
    export async function saveTailGroups(form){window.tailSaves.push(Object.fromEntries(form));await new Promise(r=>setTimeout(r,200));return {success:true,message:'Son iki grup güncellendi. Geçmiş tahsilatlar değiştirilmedi.'}}
  `,
        }));
      },
    },
  ],
});
const server = createServer((req, res) => {
  if (req.url === "/fixture.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    res.end(result.outputFiles[0].text);
  } else if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(
      `<!doctype html><html lang="tr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Tail group isolated fixture</title><style>body{font:15px system-ui;background:#f6f6f6;color:#202b25}dialog{margin:auto;box-sizing:border-box;width:min(94vw,830px);max-height:90vh;overflow:auto;padding:22px;border:1px solid #ccc;border-radius:16px}input,textarea,button{font:inherit;padding:8px;box-sizing:border-box}input[type=number],textarea{width:100%}button{margin:8px 0}label{display:block}section{border:1px solid #ccc;border-radius:12px;padding:16px;margin:12px 0}section ul{max-height:150px;overflow:auto;padding-left:16px}fieldset{border:0;padding:0}fieldset>div{display:grid;gap:16px}@media(min-width:640px){fieldset>div{grid-template-columns:1fr 1fr}}.admin-label{display:block;margin-top:8px}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`,
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(4321, "127.0.0.1", () =>
  console.log("Tail group fixture http://127.0.0.1:4321"),
);
