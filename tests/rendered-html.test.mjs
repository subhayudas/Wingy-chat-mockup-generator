import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Wingy chat video studio", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Wingy Studio — UGC Chat Video Generator<\/title>/i);
  assert.match(html, /href="\/favicon\.ico"/i);
  assert.match(html, /Make the chat/);
  assert.match(html, /ZIP filename/);
  assert.match(html, /Photo/);
  assert.match(html, /Sticker/);
  assert.match(html, /Export high-quality video/);
  assert.match(html, /1080/);
  assert.match(html, /1296/);
  assert.doesNotMatch(html, /Building your site|Your site is taking shape/);
});

test("keeps the media and video controls wired into the canvas renderer", async () => {
  const [page, favicon] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/favicon.ico", import.meta.url)),
  ]);
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
  assert.match(page, /kind: "file"/);
  assert.match(page, /kind: "image" \| "sticker"/);
  assert.match(page, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(page, /accept="image\/png,image\/webp,image\/gif"/);
  assert.match(page, /captureStream\(30\)/);
  assert.match(page, /videoBitsPerSecond: 12_000_000/);
  assert.match(page, /format === "reference"/);
  assert.match(page, /format === "vertical"/);
  assert.match(page, /drawComposer/);
  assert.match(page, /wingy-logo\.jpeg/);
  assert.match(page, /const CHAT_FONT =/);
  assert.match(page, /ctx\.font = CHAT_FONT;\s*const widest/);
  assert.match(page, /ctx\.measureText\(candidate\)\.width > maxWidth/);
  assert.match(page, /function drawSecurityNotice/);
  assert.match(page, /wrapText\(ctx, "This business uses a secure service/);
  assert.match(page, /function drawStickerGlyph/);
  assert.match(page, /function drawShareIcon/);
  assert.match(page, /ctx\.bezierCurveTo\(x - 15, y - 2/);
  assert.match(page, /const CHAT_TIME = "12:31 PM"/);
  assert.match(page, /outgoing \? `\$\{CHAT_TIME\} ✓✓` : CHAT_TIME/);
  assert.doesNotMatch(page, /"1:20 PM"/);
});
