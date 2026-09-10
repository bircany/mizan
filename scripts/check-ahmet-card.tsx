/** Regression: removing the last standard campaign must not hide Ahmet settings. */
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const output = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from 'react';
    import assert from 'node:assert/strict';
    import {renderToStaticMarkup} from 'react-dom/server';
    import {UnifiedDonationManagement} from './components/admin/unified-donation-management';
    const campaign = {id:'41',title:"Ahmet'e Destek (TRY)",currency:'TRY',status:'active'};
    const base = {campaigns:[campaign],donations:[],efts:[],query:'',tab:'campaigns',editorData:{records:[],categoryOptions:[],mediaOptions:[],childDonation:{campaign:'41',usdCampaign:'42',eurCampaign:'43'}}};
    for (const campaigns of [[campaign],[],[campaign,{id:'45',title:'Test',currency:'TRY',status:'active'}]]) {
      const html=renderToStaticMarkup(<UnifiedDonationManagement {...base} campaigns={campaigns}/>);
      assert.ok(html.includes('data-ahmet-card'), 'Ahmet card must remain visible');
      assert.ok(!html.includes('Kampanya bulunamadı'));
    }
    console.log('PASS: Ahmet card remains visible with only Ahmet, no standard campaigns, and mixed campaigns.');
  ` },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  plugins: [{name:"isolate-actions",setup(b){
    b.onResolve({filter:/^@\/components\/admin\//},args => ({path:args.path,namespace:"stub"}));
    b.onLoad({filter:/.*/,namespace:"stub"},args=>({loader:"tsx",resolveDir:process.cwd(),contents:args.path.endsWith('child-donation-settings-card')
      ? 'export function ChildDonationSettingsCard(){return <div data-ahmet-card="true">Ahmet</div>}'
      : 'export const UnifiedCampaignEditor=()=>null,EmptyPanelState=()=>null,PanelCard=()=>null,StatusBadge=()=>null,EftReviewActions=()=>null,PanelSectionTabs=()=>null,ManualDonationForm=()=>null,ManualDonationProof=()=>null;'}));
  }}],
});
const dir=await mkdtemp(join(tmpdir(),'mizan-ahmet-test-'));
try {const file=join(dir,'test.cjs');await writeFile(file,output.outputFiles[0].text);await import(pathToFileURL(file).href);}
finally {await rm(dir,{recursive:true,force:true});}
