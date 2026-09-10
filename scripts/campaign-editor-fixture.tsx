/** Isolated real-component browser fixture. No credentials, database or Next routes. */
import { build } from "esbuild";
import { createServer } from "node:http";

const result = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { UnifiedCampaignEditor } from './components/admin/unified-campaign-editor';
      window.fixtureSaves = [];
      createRoot(document.getElementById('root')).render(
        <UnifiedCampaignEditor categories={[{label:'Test kategori',value:'1'}]} media={[]} />
      );
    `,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  jsx: "automatic",
  platform: "browser",
  plugins: [{
    name: "no-server-access",
    setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/admin\/(unified-campaign-actions|media-actions|tail-group-actions)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: `
          export async function saveUnifiedCampaign(_, data) {
            window.fixtureSaves.push(Object.fromEntries(data));
            await new Promise(resolve => setTimeout(resolve, 250));
            return {success:true,message:'Test kaydı'};
          }
          export async function deleteUnifiedCampaign() { throw new Error('Disabled in fixture'); }
          export async function uploadMedia() { throw new Error('Disabled in fixture'); }
          export async function previewTailGroups() { throw new Error('Disabled in fixture'); }
          export async function saveTailGroups() { throw new Error('Disabled in fixture'); }
        `,
        loader: "js",
      }));
      builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "image-fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "image-fixture" }, () => ({ contents: "export default function Image(){return null}", loader: "js" }));
    },
  }],
});

const script = result.outputFiles[0].text;
const server = createServer((request, response) => {
  if (request.url === "/fixture.js") {
    response.writeHead(200, { "content-type": "text/javascript" });
    response.end(script);
  } else if (request.url === "/") {
    response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
    response.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Campaign editor isolated test</title>
      <style>[hidden]{display:none!important}dialog{width:min(900px,90vw)}button,input,select,textarea{margin:6px;padding:8px}textarea{display:block}label{display:block}</style>
      </head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`);
  } else {
    response.writeHead(404);
    response.end();
  }
});
server.listen(4319, "127.0.0.1", () => console.log("Isolated campaign fixture: http://127.0.0.1:4319"));
