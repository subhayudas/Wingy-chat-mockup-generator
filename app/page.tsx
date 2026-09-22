"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import type { WingyConversation, WingyTone } from "@/lib/wingy-conversation";

type Speaker = "user" | "wingy";
type MessageKind = "text" | "file" | "image" | "sticker";
type Tone = "Playful" | "Sharp" | "Soft";
type Format = "reference" | "vertical";
type Message = {
  id: number;
  speaker: Speaker;
  text: string;
  kind?: MessageKind;
  meta?: string;
  src?: string;
};

const hooks = [
  "Is he actually into me?",
  "Rate all the men I dated this year",
  "Is he a green flag?",
];

const seedMessages: Message[] = [
  { id: 1, speaker: "user", kind: "file", text: "WhatsAppChat.zip", meta: "9 KB · zip" },
  { id: 2, speaker: "user", text: "Is he actually into me?" },
  { id: 3, speaker: "wingy", text: "I read all 4,382 messages so you don't have to." },
  { id: 4, speaker: "wingy", text: "You: 71% of the texts, 234 double texts, 4-minute replies. Him: 8-hour replies. Unless it's past 11pm, then he's suddenly very fast. 💀" },
  { id: 5, speaker: "user", text: "okay that was personal" },
  { id: 6, speaker: "wingy", text: "Stories cost him one thumb tap. A real conversation costs intention." },
];

const imageCache = new Map<string, HTMLImageElement>();
const CHAT_FONT = "35px -apple-system, BlinkMacSystemFont, Arial";
const CHAT_TEXT_MAX_WIDTH = 710;
const CHAT_TIME = "12:31 PM";

function loadCanvasImage(src: string, onLoad: () => void) {
  if (!src || imageCache.has(src)) return;
  const image = new Image();
  image.onload = () => { imageCache.set(src, image); onLoad(); };
  image.src = src;
}

function makeZip(name: string, id = Date.now()): Message {
  const clean = (name.trim() || "WhatsAppChat.zip").replace(/\.zip$/i, "");
  return { id, speaker: "user", kind: "file", text: `${clean}.zip`, meta: "9 KB · zip" };
}

function readingTime(text: string) {
  return Math.min(3.8, Math.max(1.15, 0.55 + text.length / 31));
}

function timelineFor(messages: Message[]) {
  let cursor = 0.25;
  return messages.map((message) => {
    const typing = message.speaker === "wingy" ? Math.min(1.4, 0.42 + message.text.length / 110) : 0.7;
    cursor += typing;
    const reveal = cursor;
    cursor += message.kind === "sticker" ? 1.7 : readingTime(message.text);
    return { ...message, reveal, typingStart: reveal - typing };
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/);
    let line = "";
    words.forEach((word) => {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) { lines.push(line); line = ""; }
        let segment = "";
        for (const character of word) {
          const candidate = `${segment}${character}`;
          if (ctx.measureText(candidate).width > maxWidth && segment) {
            lines.push(segment);
            segment = character;
          } else segment = candidate;
        }
        line = segment;
        return;
      }
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    });
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push("");
  });
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  ctx.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
}

function drawWallpaper(ctx: CanvasRenderingContext2D, height: number) {
  ctx.fillStyle = "#f4f0e8"; ctx.fillRect(0, 0, 1080, height);
  ctx.save();
  ctx.strokeStyle = "#d7d0c4"; ctx.fillStyle = "#d7d0c4"; ctx.lineWidth = 2.3; ctx.globalAlpha = 0.34;
  for (let row = 0, y = 150; y < height; row += 1, y += 105) {
    for (let col = 0, x = -20 + (row % 2) * 53; x < 1120; col += 1, x += 108) {
      const icon = (row * 5 + col) % 7;
      ctx.save(); ctx.translate(x, y); ctx.rotate(((row + col) % 3 - 1) * 0.16);
      ctx.beginPath();
      if (icon === 0) { ctx.roundRect(4, 8, 55, 38, 8); ctx.moveTo(15, 46); ctx.lineTo(9, 57); ctx.lineTo(29, 46); }
      if (icon === 1) { ctx.moveTo(29, 55); ctx.bezierCurveTo(-1, 35, 5, 5, 29, 18); ctx.bezierCurveTo(53, 5, 59, 35, 29, 55); }
      if (icon === 2) { ctx.arc(30, 30, 24, 0, Math.PI * 2); ctx.moveTo(20, 22); ctx.lineTo(20, 37); ctx.moveTo(40, 22); ctx.lineTo(40, 37); }
      if (icon === 3) { ctx.moveTo(5, 8); ctx.lineTo(48, 8); ctx.lineTo(29, 29); ctx.lineTo(54, 29); ctx.lineTo(13, 58); ctx.lineTo(24, 35); ctx.lineTo(3, 35); ctx.closePath(); }
      if (icon === 4) { ctx.arc(30, 30, 24, 0, Math.PI * 2); ctx.moveTo(30, 8); ctx.lineTo(30, 52); ctx.moveTo(8, 30); ctx.lineTo(52, 30); }
      if (icon === 5) { ctx.moveTo(6, 49); ctx.quadraticCurveTo(30, 0, 56, 49); ctx.moveTo(14, 49); ctx.lineTo(47, 49); }
      if (icon === 6) { ctx.arc(29, 29, 18, 0, Math.PI * 2); ctx.moveTo(41, 42); ctx.lineTo(54, 55); }
      ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
}

function drawShareIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "rgba(118,124,122,.55)"; ctx.beginPath(); ctx.arc(x, y, 37, 0, Math.PI * 2); ctx.fill();
  // WhatsApp's attachment affordance is a filled, curved forward arrow.
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 16);
  ctx.bezierCurveTo(x - 15, y - 2, x - 4, y - 9, x + 6, y - 9);
  ctx.lineTo(x + 6, y - 21);
  ctx.lineTo(x + 25, y - 2);
  ctx.lineTo(x + 6, y + 17);
  ctx.lineTo(x + 6, y + 5);
  ctx.bezierCurveTo(x - 6, y + 4, x - 13, y + 8, x - 20, y + 16);
  ctx.closePath(); ctx.fill();
}

function drawStickerGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, width = 44, height = 39) {
  // Proportional so the glyph keeps its shape at the reference size (51 x 50).
  const rx = width * 0.227;
  const ry = height * 0.256;
  const foldX = width * 0.659;
  const foldY = height * 0.615;
  ctx.strokeStyle = "#191919"; ctx.lineWidth = 4.7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + width - rx, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + ry);
  ctx.lineTo(x + width, y + foldY);
  ctx.quadraticCurveTo(x + width, y + height, x + foldX, y + height);
  ctx.lineTo(x + rx, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - ry);
  ctx.lineTo(x, y + ry);
  ctx.quadraticCurveTo(x, y, x + rx, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + foldX, y + height);
  ctx.bezierCurveTo(x + foldX, y + height * 0.744, x + width * 0.818, y + foldY, x + width, y + foldY);
  ctx.stroke();
}

function drawDeliveryTicks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = "#53bdeb";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Two overlapping vector checks match WhatsApp's read-receipt mark much
  // more closely than a pair of font glyphs, which vary across platforms.
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + 6, y + 14);
  ctx.lineTo(x + 18, y + 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 9, y + 8);
  ctx.lineTo(x + 15, y + 14);
  ctx.lineTo(x + 27, y + 2);
  ctx.stroke();
  ctx.restore();
}

function drawMessageMeta(ctx: CanvasRenderingContext2D, time: string, x: number, y: number, outgoing: boolean) {
  ctx.font = "21px -apple-system, BlinkMacSystemFont, Arial";
  ctx.fillStyle = outgoing ? "#667781" : "#7d817e";
  ctx.textAlign = "right";
  ctx.fillText(time, outgoing ? x - 42 : x, y);
  ctx.textAlign = "left";
  if (outgoing) drawDeliveryTicks(ctx, x - 31, y - 15);
}

function drawSecurityNotice(ctx: CanvasRenderingContext2D, y = 211) {
  const x = 160;
  const width = 760;
  const lineHeight = 31;
  ctx.font = "27px -apple-system, BlinkMacSystemFont, Arial";
  const lines = wrapText(ctx, "This business uses a secure service from Meta to manage this chat. Tap to learn more.", 570);
  const height = lines.length * lineHeight + 20;
  ctx.fillStyle = "#d2f7e8"; roundedRect(ctx, x, y, width, height, 14);
  ctx.fillStyle = "#1c3930"; ctx.textAlign = "center";
  lines.forEach((line, index) => ctx.fillText(line, x + width / 2, y + 27 + index * lineHeight));
  ctx.textAlign = "left";
  return y + height;
}

function drawZipIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6c7478"; roundedRect(ctx, x, y, 66, 82, 8);
  ctx.fillStyle = "#8e9698"; ctx.fillRect(x + 31, y, 7, 42);
  for (let i = 0; i < 4; i += 1) { ctx.fillStyle = i % 2 ? "#596266" : "#bac0c0"; ctx.fillRect(x + 25 + (i % 2) * 7, y + i * 10, 7, 8); }
  ctx.fillStyle = "#fff"; ctx.font = "700 17px Arial"; ctx.textAlign = "center"; ctx.fillText("ZIP", x + 33, y + 69); ctx.textAlign = "left";
}

function drawHeader(ctx: CanvasRenderingContext2D, logo?: HTMLImageElement) {
  ctx.save();
  ctx.shadowColor = "rgba(61,58,52,.13)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = "#faf9f6"; ctx.fillRect(0, 0, 1080, 142); ctx.restore();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(70, 70, 50, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#111"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(68, 47); ctx.lineTo(45, 70); ctx.lineTo(68, 93); ctx.stroke();
  ctx.fillStyle = "#171717"; ctx.font = "400 34px Arial"; ctx.fillText("27", 79, 82);
  ctx.save(); ctx.beginPath(); ctx.arc(205, 70, 48, 0, Math.PI * 2); ctx.clip();
  if (logo) drawCover(ctx, logo, 157, 22, 96, 96); else { ctx.fillStyle = "#0a0a0a"; ctx.fillRect(157, 22, 96, 96); }
  ctx.restore();
  ctx.fillStyle = "#101010"; ctx.font = "600 41px -apple-system, BlinkMacSystemFont, Arial"; ctx.fillText("Wingy", 278, 84);
}

// Chrome geometry, measured off the reference recording at 1080 canvas width.
const HEADER_HEIGHT = 142;
const COMPOSER_HEIGHT = 132;
// The transcript column: date divider, security notice, then the bubbles.
const TODAY_TOP = 157;
const TODAY_HEIGHT = 39;
const NOTICE_TOP = 211;
const CONVERSATION_TOP = 340;
const MESSAGE_GAP = 14;
// The reference settles each new bubble 20px above the composer and eases the
// jump over ~0.145s — four frames of its 30fps capture, ease-in-out both ends.
const SCROLL_BOTTOM_GAP = 20;
const SCROLL_DURATION = 0.145;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawTodayPill(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = "rgba(255,255,255,.93)";
  roundedRect(ctx, 472, y, 136, TODAY_HEIGHT, 12);
  ctx.fillStyle = "#292929";
  ctx.font = "600 25px -apple-system, BlinkMacSystemFont, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Today", 540, y + 27);
  ctx.textAlign = "left";
}

function drawComposer(ctx: CanvasRenderingContext2D, height: number, typingText = "") {
  const y = height - COMPOSER_HEIGHT;
  // Every control shares one centre line, 70px below the composer's top edge.
  const mid = y + 70;
  // Radius of the trailing round button, shared by the mic and send states.
  const buttonR = 36;
  ctx.fillStyle = "rgba(250,249,246,.98)";
  ctx.fillRect(0, y, 1080, COMPOSER_HEIGHT);

  // Attachment "+"
  ctx.strokeStyle = "#181818"; ctx.lineWidth = 4.7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(63, mid - 25.2); ctx.lineTo(63, mid + 25.2);
  ctx.moveTo(37.8, mid); ctx.lineTo(88.2, mid);
  ctx.stroke();

  // Input field
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#d1d2d0"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(132, y + 33, 687, 78, 39); ctx.fill(); ctx.stroke();

  if (typingText) {
    ctx.fillStyle = "#252525";
    ctx.font = "35px -apple-system, BlinkMacSystemFont, Arial";
    ctx.fillText(typingText, 160, mid + 12);
  } else {
    // Idle caret: WhatsApp draws a round-capped bar in the accent green.
    ctx.strokeStyle = "#137a4a"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(168, y + 52.5); ctx.lineTo(168, y + 91.5); ctx.stroke();
  }

  drawStickerGlyph(ctx, 742.5, y + 49.5, 45.5, 44);

  if (typingText) {
    ctx.fillStyle = "#21b86b";
    ctx.beginPath(); ctx.arc(1017, mid, buttonR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(1017 - 0.48 * buttonR, mid - 0.59 * buttonR);
    ctx.lineTo(1017 + 0.66 * buttonR, mid);
    ctx.lineTo(1017 - 0.48 * buttonR, mid + 0.59 * buttonR);
    ctx.lineTo(1017 - 0.16 * buttonR, mid);
    ctx.closePath();
    ctx.fill();
  } else {
    // Camera: body, lens, viewfinder hump and the little indicator dot.
    const bodyLeft = 876;
    const bodyRight = 935;
    const bodyTop = mid - 16.4;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 4.7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.roundRect(bodyLeft, bodyTop, bodyRight - bodyLeft, 39, 8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyLeft + 17, bodyTop);
    ctx.lineTo(bodyLeft + 23, bodyTop - 5.5);
    ctx.lineTo(bodyLeft + 37, bodyTop - 5.5);
    ctx.lineTo(bodyLeft + 43, bodyTop);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(906.5, mid + 2.2, 12.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(924.5, mid - 7.2, 3.9, 0, Math.PI * 2); ctx.fill();

    // Mic laid out on WhatsApp's own 24-unit icon grid: a filled capsule head
    // spanning units 9-15 across and 2-14 down with fully rounded ends, a
    // 5-unit cradle arc centred at unit 11, and a 3-unit stem down to unit 19.
    const micX = 1017;
    const u = buttonR * 0.06;
    const gy = (unit: number) => mid + (unit - 10.7) * u;
    ctx.fillStyle = "#21b86b";
    ctx.beginPath(); ctx.arc(micX, mid, buttonR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.roundRect(micX - 3 * u, gy(2), 6 * u, 12 * u, 3 * u); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6 * u; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(micX, gy(11), 5 * u, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(micX, gy(16)); ctx.lineTo(micX, gy(19)); ctx.stroke();
  }
}

function drawWhatsApp(canvas: HTMLCanvasElement, messages: Message[], time: number, logoSrc: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = canvas.width / 1080;
  ctx.save(); ctx.scale(scale, scale);
  const height = canvas.height / scale;
  const composerTop = height - COMPOSER_HEIGHT;
  drawWallpaper(ctx, height);

  const timed = timelineFor(messages);
  const typing = timed.find((item) => item.speaker === "user" && time >= item.typingStart && time < item.reveal && !item.kind);
  ctx.font = CHAT_FONT;

  // Measure the whole transcript up front so the resting scroll offset after
  // each reveal is known, and the animated offset stays a pure function of time.
  const layouts = timed.map((message) => {
    const lines = message.kind && message.kind !== "text" ? [message.text] : wrapText(ctx, message.text, CHAT_TEXT_MAX_WIDTH);
    const messageHeight = message.kind === "file" ? 145 : message.kind === "image" ? 365 : message.kind === "sticker" ? 310 : Math.max(78, lines.length * 43 + 43);
    return { ...message, lines, messageHeight };
  });

  const tops: number[] = [];
  const restingOffsets = [0];
  let cursor = CONVERSATION_TOP;
  for (const item of layouts) {
    tops.push(cursor);
    restingOffsets.push(Math.max(0, cursor + item.messageHeight + SCROLL_BOTTOM_GAP - composerTop));
    cursor += item.messageHeight + MESSAGE_GAP;
  }

  const revealed = layouts.filter((item) => time >= item.reveal).length;
  let offset = restingOffsets[revealed];
  if (revealed > 0) {
    const progress = (time - layouts[revealed - 1].reveal) / SCROLL_DURATION;
    if (progress < 1) {
      const from = restingOffsets[revealed - 1];
      offset = from + (restingOffsets[revealed] - from) * easeInOutCubic(Math.max(0, progress));
    }
  }

  // The transcript lives between the header and the composer and slides behind
  // both, so a new bubble rises out from under the composer as the list scrolls.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HEADER_HEIGHT, 1080, composerTop - HEADER_HEIGHT);
  ctx.clip();

  drawSecurityNotice(ctx, NOTICE_TOP - offset);

  for (let index = 0; index < revealed; index += 1) {
    const item = layouts[index];
    const y = tops[index] - offset;
    if (y > composerTop || y + item.messageHeight + 40 < HEADER_HEIGHT) continue;
    const outgoing = item.speaker === "user";
    const bubble = outgoing ? "#c9f7be" : "#ffffff";
    if (item.kind === "sticker") {
      const image = item.src ? imageCache.get(item.src) : undefined;
      const x = outgoing ? 717 : 46;
      if (image) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, 315, 260, 16); ctx.clip(); drawCover(ctx, image, x, y, 315, 260); ctx.restore();
      } else { ctx.fillStyle = "rgba(255,255,255,.9)"; roundedRect(ctx, x, y, 315, 260, 16); }
      if (item.text) { ctx.fillStyle = "#fff"; roundedRect(ctx, x + 35, y + 232, 245, 52, 9); ctx.fillStyle = "#111"; ctx.font = "600 29px Arial"; ctx.textAlign = "center"; ctx.fillText(item.text, x + 157, y + 267); ctx.textAlign = "left"; }
      const metaWidth = outgoing ? 168 : 126;
      ctx.fillStyle = "rgba(255,255,255,.95)"; roundedRect(ctx, x + 58, y + 289, metaWidth, 34, 12);
      drawMessageMeta(ctx, CHAT_TIME, x + 58 + metaWidth - 12, y + 314, outgoing);
      continue;
    }

    let bubbleWidth = 790;
    if (!item.kind || item.kind === "text") {
      // Canvas font state changes while drawing timestamps and attachment metadata.
      // Reset it before measuring so the bubble and its rendered text use the same font.
      ctx.font = CHAT_FONT;
      const widest = Math.max(...item.lines.map((line) => ctx.measureText(line).width));
      bubbleWidth = Math.min(805, Math.max(210, widest + 62));
    } else if (item.kind === "image") bubbleWidth = 500;
    const x = outgoing ? 1080 - bubbleWidth - 42 : 42;
    if (item.kind === "file") drawShareIcon(ctx, x - 52, y + 69);
    ctx.save(); ctx.shadowColor = "rgba(64,57,49,.09)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; ctx.fillStyle = bubble; roundedRect(ctx, x, y, bubbleWidth, item.messageHeight, 20); ctx.restore();
    ctx.fillStyle = bubble; ctx.beginPath();
    if (outgoing) { ctx.moveTo(x + bubbleWidth - 15, y + 15); ctx.lineTo(x + bubbleWidth + 15, y + 2); ctx.lineTo(x + bubbleWidth - 2, y + 38); }
    else { ctx.moveTo(x + 15, y + 15); ctx.lineTo(x - 15, y + 2); ctx.lineTo(x + 2, y + 38); }
    ctx.closePath(); ctx.fill();

    if (item.kind === "file") {
      ctx.fillStyle = "rgba(255,255,255,.38)"; roundedRect(ctx, x + 15, y + 12, bubbleWidth - 30, 92, 13);
      drawZipIcon(ctx, x + 34, y + 18);
      ctx.fillStyle = "#161817"; ctx.font = "400 36px -apple-system, BlinkMacSystemFont, Arial"; ctx.fillText(item.text, x + 122, y + 55);
      ctx.fillStyle = "#69716f"; ctx.font = "26px -apple-system, BlinkMacSystemFont, Arial"; ctx.fillText(item.meta || "9 KB · zip", x + 122, y + 90);
    } else if (item.kind === "image") {
      const image = item.src ? imageCache.get(item.src) : undefined;
      ctx.save(); ctx.beginPath(); ctx.roundRect(x + 10, y + 10, bubbleWidth - 20, 292, 14); ctx.clip();
      if (image) drawCover(ctx, image, x + 10, y + 10, bubbleWidth - 20, 292); else { ctx.fillStyle = "#e6e3dd"; ctx.fillRect(x + 10, y + 10, bubbleWidth - 20, 292); }
      ctx.restore();
      if (item.text) { ctx.fillStyle = "#171717"; ctx.font = "31px -apple-system, BlinkMacSystemFont, Arial"; ctx.fillText(item.text, x + 22, y + 335); }
    } else {
      ctx.fillStyle = "#151515"; ctx.font = CHAT_FONT;
      item.lines.forEach((line, lineIndex) => ctx.fillText(line, x + 28, y + 39 + lineIndex * 43));
    }
    drawMessageMeta(ctx, CHAT_TIME, x + bubbleWidth - 18, y + item.messageHeight - 11, outgoing);
  }

  // The date divider is sticky: it holds its place while the transcript
  // scrolls behind it, exactly as WhatsApp pins it.
  drawTodayPill(ctx, Math.max(TODAY_TOP, TODAY_TOP - offset));
  ctx.restore();

  drawHeader(ctx, imageCache.get(logoSrc));
  drawComposer(ctx, height, typing ? typing.text.slice(0, Math.max(1, Math.floor(((time - typing.typingStart) / (typing.reveal - typing.typingStart)) * typing.text.length))) : "");
  ctx.restore();
}

function Icon({ name }: { name: "zip" | "photo" | "sticker" | "play" | "download" | "spark" | "plus" }) {
  const paths = {
    zip: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M10 3h2M10 7h2M10 11h2M9 15h4v3H9z"/></>,
    photo: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 17 5-5 4 4 2-2 5 4"/></>,
    sticker: <><path d="M5 3h14a2 2 0 0 1 2 2v9l-7 7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 21v-5a2 2 0 0 1 2-2h5M8 9h.01M16 9h.01M8 14c2.2 2 5.8 2 8 0"/></>,
    play: <path d="m9 6 9 6-9 6z"/>, download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16"/></>,
    spark: <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z"/>, plus: <path d="M12 5v14M5 12h14"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [theme, setTheme] = useState(hooks[0]);
  const [tone, setTone] = useState<Tone>("Sharp");
  const [count, setCount] = useState(7);
  const [zipName, setZipName] = useState("WhatsAppChat.zip");
  const [format, setFormat] = useState<Format>("reference");
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(99);
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [renderVersion, setRenderVersion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAt = useRef(0);
  const messageId = useRef(1000);
  const logoSrc = "/wingy-logo.png";
  const dimensions = format === "reference" ? { width: 1080, height: 1296 } : { width: 1080, height: 1920 };
  const timeline = useMemo(() => timelineFor(messages), [messages]);
  const duration = (timeline.at(-1)?.reveal || 0) + readingTime(messages.at(-1)?.text || "") + 0.6;

  useEffect(() => {
    loadCanvasImage(logoSrc, () => setRenderVersion((value) => value + 1));
    messages.forEach((message) => { if (message.src) loadCanvasImage(message.src, () => setRenderVersion((value) => value + 1)); });
  }, [messages]);

  useEffect(() => {
    if (canvasRef.current) drawWhatsApp(canvasRef.current, messages, playTime, logoSrc);
  }, [messages, playTime, renderVersion, format]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const next = (performance.now() - startedAt.current) / 1000;
      if (next >= duration) { setPlayTime(duration); setPlaying(false); return; }
      setPlayTime(next); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

  const updateMessage = (id: number, patch: Partial<Message>) => setMessages((current) => current.map((message) => message.id === id ? { ...message, ...patch } : message));

  const updateZip = (value: string) => {
    setZipName(value);
    setMessages((items) => items.map((item) => item.kind === "file" ? { ...item, text: `${value.replace(/\.zip$/i, "") || "WhatsAppChat"}.zip` } : item));
  };

  const uploadMedia = (event: ChangeEvent<HTMLInputElement>, kind: "image" | "sticker") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose a PNG, JPG, WebP, or GIF image."); return; }
    if (file.size > 12 * 1024 * 1024) { setError("That file is over 12 MB. Choose a smaller image."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const item: Message = { id: Date.now(), speaker: "wingy", kind, src, text: kind === "sticker" ? "Girl…" : "Screenshot" };
      setMessages((current) => {
        const withoutSame = current.filter((message) => message.kind !== kind);
        const zipIndex = withoutSame.findIndex((message) => message.kind === "file");
        const next = [...withoutSame]; next.splice(Math.max(0, zipIndex + 1), 0, item); return next;
      });
      setError(""); setPlayTime(99);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const preview = () => { setPlayTime(0); startedAt.current = performance.now(); setPlaying(true); };

  const generateConversation = async () => {
    const toneMap: Record<Tone, WingyTone> = { Playful: "playful", Sharp: "sharp", Soft: "soft" };
    const targetSeconds = count === 5 ? 20 : count === 9 ? 36 : 28;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, tone: toneMap[tone], target_seconds: targetSeconds }),
      });
      const payload = await response.json() as WingyConversation & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Conversation generation failed.");
      const now = messageId.current += 100;
      const generatedText = payload.messages
        .filter((message) => message.kind === "text")
        .map((message, index) => ({ ...message, kind: "text" as const, id: now + mediaMessages.length + index + 1 }));
      setMessages([
        makeZip(zipName, now),
        ...mediaMessages.map((message, index) => ({ ...message, id: now + index + 1 })),
        ...generatedText,
      ]);
      setPlayTime(99);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Conversation generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const exportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !("MediaRecorder" in window)) { setError("Video export needs a current version of Chrome, Edge, or Safari."); return; }
    setError(""); setPlaying(false); setExporting(true); setProgress(0); setPlayTime(0);
    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1") ? "video/mp4;codecs=avc1" : MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      recorder.start(200);
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const render = () => {
          const elapsed = (performance.now() - start) / 1000;
          drawWhatsApp(canvas, messages, Math.min(duration, elapsed), logoSrc);
          setProgress(Math.min(100, Math.round((elapsed / duration) * 100)));
          if (elapsed >= duration) { recorder.stop(); resolve(); } else requestAnimationFrame(render);
        };
        render();
      });
      await stopped;
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `wingy-chat-${format}-${Date.now()}.${mimeType.startsWith("video/mp4") ? "mp4" : "webm"}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
      setPlayTime(duration);
    } catch { setError("The browser could not render this video. Try Chrome or Safari and export again."); }
    finally { setExporting(false); setProgress(0); }
  };

  const mediaMessages = messages.filter((message) => message.kind === "image" || message.kind === "sticker");

  return (
    <main>
      <header className="topbar">
        <div className="brand"><NextImage src={logoSrc} alt="Wingy" width={36} height={36} priority /><span>Wingy Studio</span><small>CREATOR</small></div>
        <div className="topMeta"><span className="liveDot" /> Files stay in this browser</div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">CHAT VIDEO BUILDER</p><h1>Make the chat<br /><em>look completely real.</em></h1></div>
        <p className="subhead">Build the same Wingy WhatsApp mockups from your references. Add the actual ZIP name, photo, and sticker—then export a crisp, timed video.</p>
      </section>

      <section className="studio">
        <section className="controls panel" aria-label="Video controls">
          <div className="sectionHeading"><span>01</span><div><h2>Set the opening</h2><p>These assets appear inside the chat, exactly where viewers expect them.</p></div></div>

          <label htmlFor="zipName">ZIP filename</label>
          <div className="zipField"><span><Icon name="zip" /></span><input id="zipName" value={zipName} onChange={(event) => updateZip(event.target.value)} aria-describedby="zipHelp" /></div>
          <p className="fieldHelp" id="zipHelp">“.zip” is added automatically if you leave it off.</p>

          <div className="assetGrid">
            <article className={mediaMessages.some((item) => item.kind === "image") ? "assetCard hasAsset" : "assetCard"}>
              <div className="assetIcon"><Icon name="photo" /></div><div><strong>Photo</strong><span>JPG, PNG or WebP</span></div>
              <label className="assetAction" htmlFor="photo-upload">{mediaMessages.some((item) => item.kind === "image") ? "Replace" : "Add"}</label>
              <input id="photo-upload" hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadMedia(event, "image")} />
            </article>
            <article className={mediaMessages.some((item) => item.kind === "sticker") ? "assetCard hasAsset" : "assetCard"}>
              <div className="assetIcon"><Icon name="sticker" /></div><div><strong>Sticker</strong><span>PNG, WebP or GIF</span></div>
              <label className="assetAction" htmlFor="sticker-upload">{mediaMessages.some((item) => item.kind === "sticker") ? "Replace" : "Add"}</label>
              <input id="sticker-upload" hidden type="file" accept="image/png,image/webp,image/gif" onChange={(event) => uploadMedia(event, "sticker")} />
            </article>
          </div>

          <div className="formDivider" />
          <label htmlFor="theme">Video hook</label>
          <textarea id="theme" value={theme} onChange={(event) => setTheme(event.target.value)} rows={2} />
          <div className="suggestions">{hooks.map((hook) => <button key={hook} onClick={() => setTheme(hook)}>{hook}</button>)}</div>

          <div className="split">
            <div><div className="formLabel">Tone</div><div className="segmented">{(["Playful", "Sharp", "Soft"] as Tone[]).map((value) => <button className={tone === value ? "active" : ""} onClick={() => setTone(value)} key={value}>{value}</button>)}</div></div>
            <div><label htmlFor="length">Length</label><select id="length" value={count} onChange={(event) => setCount(Number(event.target.value))}><option value={5}>Quick · ~16s</option><option value={7}>Ideal · ~24s</option><option value={9}>Full · ~32s</option></select></div>
          </div>
          <button className="generate" disabled={generating} onClick={generateConversation}>{generating ? <span className="renderingDot" /> : <Icon name="spark" />} {generating ? "Writing in Wingy voice…" : "Generate conversation"}</button>

          <div className="divider" />
          <div className="sectionHeading compact"><span>02</span><div><h2>Edit every beat</h2><p>Change the copy, sender, caption, or order of the story.</p></div></div>
          <div className="scriptList">
            {messages.map((message, index) => (
              <div className="scriptRow" key={message.id}>
                <button className={`speaker ${message.speaker}`} title="Switch sender" onClick={() => updateMessage(message.id, { speaker: message.speaker === "user" ? "wingy" : "user" })}>{message.kind === "file" ? "ZIP" : message.kind === "image" ? "IMG" : message.kind === "sticker" ? "STK" : message.speaker === "wingy" ? "W" : "U"}</button>
                <textarea aria-label={`Message ${index + 1}`} value={message.text} rows={Math.max(1, Math.ceil(message.text.length / 48))} onChange={(event) => updateMessage(message.id, { text: event.target.value })} />
                <button className="delete" aria-label={`Delete message ${index + 1}`} onClick={() => setMessages((items) => items.filter((item) => item.id !== message.id))}>×</button>
              </div>
            ))}
          </div>
          <button className="add" onClick={() => setMessages((items) => [...items, { id: Date.now(), speaker: items.at(-1)?.speaker === "wingy" ? "user" : "wingy", text: "New message" }])}><Icon name="plus" /> Add message</button>
        </section>

        <aside className="previewSide">
          <div className="previewHeading"><div><span>03</span><div><strong>Live preview</strong><p>{dimensions.width} × {dimensions.height} · {Math.round(duration)} sec</p></div></div><span className="quality">HQ</span></div>
          <div className={`mockup ${format}`}><canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} /></div>
          <div className="playback">
            <button className="play" onClick={preview} aria-label="Play from start"><Icon name="play" /></button>
            <button className="track" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPlaying(false); setPlayTime(((event.clientX - rect.left) / rect.width) * duration); }} aria-label="Video timeline"><span style={{ width: `${Math.min(100, (playTime / duration) * 100)}%` }} /></button>
            <time>{Math.min(Math.round(playTime), Math.round(duration))} / {Math.round(duration)}s</time>
          </div>
          <div className="formatSwitch" aria-label="Export format">
            <button className={format === "reference" ? "active" : ""} onClick={() => setFormat("reference")}><strong>Reference</strong><span>5:6</span></button>
            <button className={format === "vertical" ? "active" : ""} onClick={() => setFormat("vertical")}><strong>Reels / TikTok</strong><span>9:16</span></button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="export" onClick={exportVideo} disabled={exporting || messages.length === 0}>{exporting ? <><span className="renderingDot" /> Rendering {progress}%</> : <><Icon name="download" /> Export high-quality video</>}</button>
          <p className="exportNote">30 fps · 12 Mbps · rendered locally</p>
        </aside>
      </section>
      <footer><span>Wingy Studio</span><span>Made for scroll-stopping chat stories.</span></footer>
    </main>
  );
}
