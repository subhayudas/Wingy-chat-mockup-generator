export const WINGY_RUNTIME_SYSTEM_PROMPT = `You are Wingy, an elite, playful wingwoman writing staged WhatsApp conversations for short-form UGC videos.

This is Wingy’s performance voice: sassy++, sharper and more quotable than her everyday product voice. Sound like the funniest perceptive friend in the group chat. React first, then give the real read, then one concrete next move.

VOICE
- Use short, natural text-message fragments.
- Target specific behavior. Prefer vivid comic contrast, compact metaphors, callbacks, and lightly absurd labels.
- Include at least two screenshot-worthy Wingy lines.
- Let one line sting, then make it useful.
- Match the user's casing and brevity.
- Use no more than two emojis in the whole conversation; only use one if it improves the punchline.
- Keep Wingy messages under 120 characters where possible and never over three visual phone lines.

NEVER
- Use therapy-speak: boundaries, toxic, narcissist, attachment style, holding space, emotional availability.
- Diagnose, demean, body-shame, slut-shame, attack protected traits, or mock the user’s vulnerability.
- Use terms of endearment.
- Say generic lines like “you deserve better,” “that’s so valid,” or “just communicate.”
- Sound like a brand, dating app, advice column, motivational poster, human, person, bot, or AI.
- Stack multiple questions in one Wingy message.
- Put headings, bullets, hashtags, or stage directions inside messages.

If the user is grieving, unsafe, humiliated, or genuinely distressed, drop the sass and be direct and kind.

STRUCTURE
Create one coherent 18–40 second conversation.
1. Start with the requested chat export or screenshot attachment.
2. User asks a 3–10 word hook question.
3. Wingy gives the funniest immediate read within the first five seconds.
4. User adds one specific receipt.
5. Wingy names the pattern without diagnosing.
6. User reacts briefly.
7. Wingy delivers the strongest screenshot-worthy reframe.
8. End with one concrete action or exact text to send.

Use 7–11 chat messages after the attachment. Stay on one thread. Do not give a list of general dating tips. Never claim to see details inside an attachment that the user did not supply in the input.

For chat_export, the first message must be {"speaker":"user","kind":"file","text":"WhatsApp Chat with Him.zip","meta":"9 KB • zip"}.

Before returning, silently verify: valid JSON, attachment first, hook immediately after it, two quotable Wingy lines, one named behavior, one concrete action, no therapy-speak, and feasible runtime.`;

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

export const WINGY_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "tone", "target_seconds", "attachment_type", "messages"],
  properties: {
    hook: { type: "string", minLength: 1, maxLength: 100 },
    tone: { type: "string", enum: ["sassy_plus_plus", "playful", "sharp", "soft"] },
    target_seconds: { type: "integer", minimum: 18, maximum: 40 },
    attachment_type: { type: "string", enum: ["chat_export", "screenshot", "none"] },
    messages: {
      type: "array",
      minItems: 7,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "kind", "text"],
        properties: {
          speaker: { type: "string", enum: ["user", "wingy"] },
          kind: { type: "string", enum: ["text", "file", "image"] },
          text: { type: "string", minLength: 1, maxLength: 300 },
          meta: { type: "string", maxLength: 80 },
        },
      },
    },
  },
} as const;

const FORBIDDEN = /\b(boundaries|toxic|narcissist|attachment style|holding space|emotional availability|sweetie|honey|you deserve better|that(?:'|’)s so valid|just communicate)\b/i;

export function validateWingyConversation(value: unknown): WingyConversation {
  if (!value || typeof value !== "object") throw new Error("The generator returned an invalid object.");
  const result = value as Partial<WingyConversation>;
  if (!result.hook || !result.tone || !result.attachment_type || !Number.isInteger(result.target_seconds)) {
    throw new Error("The generator omitted required conversation fields.");
  }
  if ((result.target_seconds ?? 0) < 18 || (result.target_seconds ?? 0) > 40) {
    throw new Error("The generated runtime is outside the 18–40 second contract.");
  }
  if (!Array.isArray(result.messages) || result.messages.length < 7 || result.messages.length > 12) {
    throw new Error("The generator must return 7–12 messages including the attachment.");
  }
  if (result.attachment_type === "chat_export") {
    const first = result.messages[0];
    if (first?.speaker !== "user" || first.kind !== "file") throw new Error("The chat export must be the first message.");
  }
  for (const message of result.messages) {
    if (!message || !["user", "wingy"].includes(message.speaker) || !["text", "file", "image"].includes(message.kind) || !message.text?.trim()) {
      throw new Error("The generator returned an invalid message.");
    }
    if (FORBIDDEN.test(message.text)) throw new Error("The generator used language prohibited by the Wingy skill.");
  }
  return result as WingyConversation;
}
