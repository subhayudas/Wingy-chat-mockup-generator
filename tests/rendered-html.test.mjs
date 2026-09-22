import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  return readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
}

test("Next.js prerenders the Wingy chat video studio", async () => {
  const html = await render();
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

test("uses the native Next.js build expected by Vercel", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.match(packageJson.dependencies.next, /^16\./);
});

test("routes conversation generation through the Wingy UGC skill prompt", async () => {
  const [page, route, skill] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/wingy-conversation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/generate"/);
  assert.doesNotMatch(page, /function generateScript/);
  assert.match(route, /WINGY_RUNTIME_SYSTEM_PROMPT/);
  assert.match(route, /ai-wingy\.services\.ai\.azure\.com/);
  assert.match(route, /AZURE_AI_FOUNDRY_KEY/);
  assert.match(route, /DeepSeek-V4-Flash/);
  assert.match(route, /response_format/);
  assert.match(route, /data_mode: "staged"/);
  // A hook may be a whole pasted script, and a run may have no hook at all.
  assert.doesNotMatch(route, /between 1 and 600 characters/);
  assert.match(route, /source_conversation: context/);
  assert.match(route, /Add a video hook, or paste a conversation to build from/);
  assert.match(page, /Use paste as-is/);
  assert.match(page, /Rewrite in Wingy voice/);
  assert.match(page, /generateFromPaste = \(\) => runGenerator\(\{ source: pasted \}\)/);
  assert.match(skill, /sassy\+\+/);
  assert.match(skill, /RECEIPTS → REAL READ → ROAST → NEXT MOVE/);
  assert.match(skill, /Wingy must send more messages than the user/);
  assert.match(skill, /The chat export must be the first message/);
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
  assert.match(page, /wingy-logo\.png/);
  assert.match(page, /const CHAT_FONT =/);
  assert.match(page, /ctx\.font = CHAT_FONT;\s*const widest/);
  assert.match(page, /ctx\.measureText\(candidate\)\.width > maxWidth/);
  assert.match(page, /function drawSecurityNotice/);
  assert.match(page, /wrapText\(ctx, "This business uses a secure service/);
  assert.match(page, /function drawStickerGlyph/);
  assert.match(page, /function drawShareIcon/);
  assert.match(page, /ctx\.bezierCurveTo\(x - 15, y - 2/);
  assert.match(page, /const CHAT_TIME = "12:31 PM"/);
  assert.match(page, /drawMessageMeta\(ctx, CHAT_TIME/);
  assert.match(page, /if \(outgoing\) drawDeliveryTicks/);
  assert.doesNotMatch(page, /"1:20 PM"/);
});
