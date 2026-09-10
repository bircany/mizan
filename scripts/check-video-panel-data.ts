import assert from "node:assert/strict";
import { build } from "esbuild";
const source: Record<string, unknown[]> = {
  "operation-groups": Array.from({ length: 201 }, (_, i) => ({
    id: i + 1,
    code: `GROUP-${i + 1}`,
    campaign: { id: 1, title: "Test kampanya", category: 3 },
    status: "open",
    updatedAt: "2026-09-10T10:00:00Z",
  })),
  "operation-videos": [],
  "delivery-messages": [],
  categories: [{ id: 3, name: "Test kategori" }],
  "operation-group-members": Array.from({ length: 1001 }, (_, i) => ({
    id: i + 1,
    group: 201,
    participant: { name: `Test ${i}`, effectivePhone: "+905551234567" },
    status: "confirmed",
    unitIndex: i + 1,
  })),
};
const fixture = {
  source,
  calls: [] as Array<{
    collection: string;
    page: number;
    select: Record<string, boolean>;
  }>,
};
(globalThis as unknown as { videoData: typeof fixture }).videoData = fixture;
const result = await build({
  entryPoints: ["lib/admin/unified-panel-data.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "isolated",
      setup(b) {
        b.onResolve({ filter: /^(server-only|@\/lib\/payload)$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          loader: "js",
          contents:
            a.path === "server-only"
              ? ""
              : `export async function getPayloadClient(){return {find:async(args)=>{const f=globalThis.videoData;f.calls.push(args);const list=f.source[args.collection];const start=(args.page-1)*args.limit;return {docs:list.slice(start,start+args.limit),hasNextPage:start+args.limit<list.length}}}}`,
        }));
      },
    },
  ],
});
const { getUnifiedDeliveryPanelData } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const rows = await getUnifiedDeliveryPanelData();
assert.equal(rows.length, 201);
assert.equal(
  rows.find((r: { groupId: string }) => r.groupId === "201").recipients.length,
  1001,
);
assert.equal(rows[0].category, "Test kategori");
assert.equal(rows[0].categoryId, "3");
assert.doesNotMatch(JSON.stringify(rows), /905551234567/);
assert.ok(
  fixture.calls.some(
    (c) => c.collection === "operation-groups" && c.page === 2,
  ),
);
assert.ok(
  fixture.calls.some(
    (c) => c.collection === "operation-group-members" && c.page === 6,
  ),
);
assert.ok(
  fixture.calls.every((c) => c.select && !c.select.accessCodeCiphertext),
);
console.log(
  "PASS: paginated 201 groups/1001 recipients, category relations, masked phones, minimal selected fields.",
);
