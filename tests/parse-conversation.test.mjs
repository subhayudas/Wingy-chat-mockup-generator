import assert from "node:assert/strict";
import test from "node:test";
import { parseConversationBlob } from "../lib/parse-conversation.ts";

const speakers = (messages) => messages.map((message) => message.speaker).join(",");

test("reads a labelled transcript", () => {
  const messages = parseConversationBlob([
    "Wingy: I read all 4,382 messages so you don't have to.",
    "User: okay that was personal",
    "Wingy: Stories cost him one thumb tap.",
  ].join("\n"));
  assert.equal(messages.length, 3);
  assert.equal(speakers(messages), "wingy,user,wingy");
  assert.equal(messages[0].text, "I read all 4,382 messages so you don't have to.");
});

test("strips the wrapper a chat model puts around the conversation", () => {
  const messages = parseConversationBlob([
    "Sure! Here's the conversation:",
    "",
    "**User:** Is he actually into me?",
    "**Wingy:** Let me check the receipts",
    "---",
    "1. User: Omg",
    "2. Wingy: This isn't a talking stage.",
  ].join("\n"));
  assert.equal(speakers(messages), "user,wingy,user,wingy");
  assert.equal(messages[1].text, "Let me check the receipts");
});

test("reads the generator's own JSON and drops the chat export", () => {
  const messages = parseConversationBlob(JSON.stringify({
    messages: [
      { speaker: "user", kind: "file", text: "WhatsApp Chat with Him.zip", meta: "9 KB" },
      { speaker: "user", kind: "text", text: "Is he into me?" },
      { speaker: "wingy", kind: "text", text: "Fast reply is not interest." },
    ],
  }));
  assert.equal(messages.length, 2);
  assert.equal(speakers(messages), "user,wingy");
});

test("reads role/content pairs and fenced JSON", () => {
  const messages = parseConversationBlob('```json\n[{"role":"user","content":"green flag?"},{"role":"assistant","content":"Beige."}]\n```');
  assert.equal(speakers(messages), "user,wingy");
  assert.equal(messages[1].text, "Beige.");
});

test("reads a WhatsApp export and maps the two names", () => {
  const messages = parseConversationBlob([
    "[12/01/25, 10:30:12 PM] Aditi: he left me on read again",
    "12/01/25, 10:31 PM - Wingy: Three days is a decision.",
  ].join("\n"));
  assert.equal(speakers(messages), "user,wingy");
  assert.equal(messages[0].text, "he left me on read again");
});

test("alternates when nothing is labelled, one message per line", () => {
  const messages = parseConversationBlob([
    "is he actually into me",
    "Girl. He replied in 8 hours.",
    "that's bad right",
  ].join("\n"));
  assert.equal(messages.length, 3);
  assert.equal(speakers(messages), "user,wingy,user");
});

test("keeps a colon that is part of the sentence", () => {
  const messages = parseConversationBlob("Wingy: Fast reply: that's just good WiFi.\nUser: lol fair");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, "Fast reply: that's just good WiFi.");
});

test("joins a message that wraps onto the next line", () => {
  const messages = parseConversationBlob("Wingy: You initiated 80%\nof conversations.\nUser: ouch");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, "You initiated 80% of conversations.");
});

test("returns nothing for an empty paste", () => {
  assert.deepEqual(parseConversationBlob("   "), []);
  assert.deepEqual(parseConversationBlob(""), []);
});
