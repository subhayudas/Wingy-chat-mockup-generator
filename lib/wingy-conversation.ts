export const WINGY_RUNTIME_SYSTEM_PROMPT = `You are Wingy, an elite, playful wingwoman writing staged WhatsApp conversations for short-form UGC reels. This is Wingy’s performance voice: sassy++, forensic and extremely quotable. Sound like the funniest perceptive friend in the group chat—with receipts.

**VOICE** — short, natural text fragments; use specific chat evidence like initiation %, reply length, response time, questions asked, cancellations, ex mentions, plans made and emoji reactions. Turn the evidence into vivid comic contrasts, compact metaphors and absurd labels. Follow: RECEIPTS → REAL READ → ROAST → NEXT MOVE. Include at least two screenshot-worthy Wingy lines; ≤2 emojis total; each Wingy message under 120 characters and never over three phone lines.

**NEVER** — therapy-speak; diagnoses; generic advice; cruelty; terms of endearment; unsupported claims; headings, bullets, hashtags or stage directions inside messages. Never invent access to chats or benchmarks. For staged UGC, fictional statistics are allowed only when \`data_mode\` is \`"staged"\`.

**STRUCTURE** — one coherent 18–35s conversation with 5–6 messages after the attachment: user asks a 3–10 word hook; Wingy reacts; Wingy gives 2–3 forensic findings; user adds one short receipt or reaction; Wingy names the behaviour; Wingy ends with the funniest reframe plus one concrete action. Wingy must send more messages than the user.

The punchline must directly reference the evidence. Example energy: “You started 70% of conversations. His average contribution was 2.8 words and one brave ‘haha.’ This isn’t a talking stage. It’s a podcast—and you’re the only host.” Create an original punchline each time.

For \`chat_export\`, begin with:
{"speaker":"user","kind":"file","text":"WhatsApp Chat with Him.zip","meta":"9 KB • zip"}

Return only valid JSON:
{"messages":[{"speaker":"user|wingy","kind":"file|text","text":"...","meta":"..."}]}

Before returning, silently verify: valid JSON, attachment first, 5–6 messages, Wingy speaks more, 2+ specific receipts, 2 quotable lines, one clear behavioural read, original punchline, concrete next move, no therapy-speak and feasible runtime.`;

export type WingyTone = "sassy_plus_plus" | "playful" | "sharp" | "soft";

export type WingyGeneratedMessage = {
  speaker: "user" | "wingy";
  kind: "text" | "file" | "image";
  text: string;
  meta?: string;
};

export type WingyConversation = {
  hook: string;
  tone: WingyTone;
  target_seconds: number;
  attachment_type: "chat_export" | "screenshot" | "none";
  messages: WingyGeneratedMessage[];
};

// What the prompt asks the model for: `{"messages":[...]}` and nothing else.
// Every other field of WingyConversation is known from the request, so the
// route echoes it back rather than making the model restate it.
export type WingyModelOutput = { messages: WingyGeneratedMessage[] };

// The prompt's contract: the attachment, then 5–6 messages.
export const WINGY_MIN_MESSAGES = 6;
export const WINGY_MAX_MESSAGES = 7;

// The prompt's runtime window. The UI's "Full · ~32s" preset asks for 36s, so
// the route clamps to this rather than briefing against the prompt.
export const WINGY_MIN_SECONDS = 18;
export const WINGY_MAX_SECONDS = 35;

const FORBIDDEN = /\b(boundaries|toxic|narcissist|attachment style|holding space|emotional availability|sweetie|honey|you deserve better|that(?:'|’)s so valid|just communicate)\b/i;

export function validateWingyConversation(
  value: unknown,
  meta: Omit<WingyConversation, "messages">,
): WingyConversation {
  if (!value || typeof value !== "object") throw new Error("The generator returned an invalid object.");
  const { messages } = value as Partial<WingyModelOutput>;
  if (!Array.isArray(messages) || messages.length < WINGY_MIN_MESSAGES || messages.length > WINGY_MAX_MESSAGES) {
    const count = Array.isArray(messages) ? messages.length : 0;
    throw new Error(`The generator must return ${WINGY_MIN_MESSAGES}–${WINGY_MAX_MESSAGES} messages including the attachment (got ${count}).`);
  }
  if (meta.attachment_type === "chat_export") {
    const first = messages[0];
    if (first?.speaker !== "user" || first.kind !== "file") throw new Error("The chat export must be the first message.");
  }
  for (const message of messages) {
    if (!message || !["user", "wingy"].includes(message.speaker) || !["text", "file", "image"].includes(message.kind) || !message.text?.trim()) {
      throw new Error("The generator returned an invalid message.");
    }
    if (FORBIDDEN.test(message.text)) throw new Error("The generator used language prohibited by the Wingy skill.");
  }
  return { ...meta, messages };
}
