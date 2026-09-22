import type { WingyGeneratedMessage } from "./wingy-conversation";

// Labels an LLM reaches for when it writes one side of the chat.
const WINGY_LABELS = new Set(["wingy", "w", "assistant", "ai", "bot", "wingwoman", "coach", "her", "she"]);
const USER_LABELS = new Set(["user", "u", "me", "you", "him", "he", "friend", "client", "person"]);

// A label is the short name before a colon. The body may be empty, which is how
// a heading like "Here's the conversation:" is told apart from a real line.
const LABEL_LINE = /^([^:：]{1,24})[:：]\s*(.*)$/;
// "[12/01/25, 10:30:12 PM] Name: text" and "12/01/25, 10:30 PM - Name: text".
const WA_BRACKET_STAMP = /^\[[^\]]{4,40}\]\s*/;
const WA_DASH_STAMP = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\s*[-–]\s*/i;
// Preambles a chat model wraps around the conversation it was asked for.
const PREAMBLE = /^(here'?s|here is|sure|certainly|of course|okay|ok|got it|absolutely)\b/i;

function stripDecoration(line: string) {
  return line
    .replace(/^\s*[-*•–—]\s+/, "")       // bullets
    .replace(/^\s*\d{1,2}[.)]\s+/, "")   // "1." / "1)"
    .replace(/^\s*>+\s*/, "")            // blockquotes
    .replace(WA_BRACKET_STAMP, "")
    .replace(WA_DASH_STAMP, "")
    .trim();
}

function stripEmphasis(value: string) {
  return value.replace(/\*\*/g, "").replace(/^__|__$/g, "").replace(/^[*_]|[*_]$/g, "").trim();
}

function cleanText(value: string) {
  const text = stripEmphasis(value).trim();
  // Models often quote the message itself; drop a single wrapping pair.
  const unquoted = /^["“]([\s\S]*)["”]$/.exec(text);
  return (unquoted ? unquoted[1] : text).trim();
}

function isNoise(line: string) {
  if (!line) return true;
  if (/^[-=_*#~]{3,}$/.test(line)) return true;              // rules and separators
  if (/^#{1,6}\s/.test(line)) return true;                   // markdown headings
  if (/^[([].*[)\]]$/.test(line) && line.length < 80) return true; // stage directions
  return false;
}

function speakerFor(label: string, seen: string[]): WingyGeneratedMessage["speaker"] | null {
  const key = label.toLowerCase().replace(/[^a-z]/g, "");
  if (WINGY_LABELS.has(key)) return "wingy";
  if (USER_LABELS.has(key)) return "user";
  if (!key) return null;
  // An unfamiliar pair of names is a two-party chat: whoever speaks first is
  // the person asking, and the next distinct name is Wingy.
  if (!seen.includes(key)) seen.push(key);
  const index = seen.indexOf(key);
  if (index === 0) return "user";
  if (index === 1) return "wingy";
  return null;
}

function fromJson(text: string): WingyGeneratedMessage[] | null {
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!unfenced.startsWith("{") && !unfenced.startsWith("[")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    return null;
  }
  const raw = Array.isArray(parsed)
    ? parsed
    : (parsed as { messages?: unknown; conversation?: unknown })?.messages
      ?? (parsed as { conversation?: unknown })?.conversation;
  if (!Array.isArray(raw)) return null;

  const seen: string[] = [];
  const out: WingyGeneratedMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const label = [item.speaker, item.role, item.from, item.sender, item.author].find((value) => typeof value === "string");
    const body = [item.text, item.content, item.message, item.value].find((value) => typeof value === "string");
    if (typeof body !== "string" || !body.trim()) continue;
    const speaker = speakerFor(typeof label === "string" ? label : "", seen) ?? "user";
    const kind = item.kind === "file" || item.kind === "image" ? item.kind : "text";
    out.push({
      speaker,
      kind,
      text: cleanText(body),
      ...(typeof item.meta === "string" ? { meta: item.meta } : {}),
    });
  }
  return out.length ? out : null;
}

function fromLines(text: string): WingyGeneratedMessage[] {
  const lines = text.split(/\r?\n/).map(stripDecoration);

  // Only treat a name before a colon as a label if it is recognisable, repeats,
  // or is a bare name — otherwise "Fast reply: that's good WiFi" splits wrongly.
  const tally = new Map<string, number>();
  for (const line of lines) {
    const match = LABEL_LINE.exec(line);
    if (!match) continue;
    const candidate = stripEmphasis(match[1]).trim();
    if (!candidate || candidate.split(/\s+/).length > 3) continue;
    tally.set(candidate.toLowerCase(), (tally.get(candidate.toLowerCase()) ?? 0) + 1);
  }
  const isLabel = (candidate: string) => {
    const key = candidate.toLowerCase();
    const flat = key.replace(/[^a-z]/g, "");
    if (!candidate || candidate.split(/\s+/).length > 3) return false;
    if (WINGY_LABELS.has(flat) || USER_LABELS.has(flat)) return true;
    if ((tally.get(key) ?? 0) > 1) return true;
    return /^[A-Z][\w'-]*$/.test(candidate); // a single bare name, e.g. "Aditi:"
  };

  // `labelled` records whether the message opened with a name. Only those
  // absorb the lines under them; an unlabelled blob is one message per line.
  type Draft = { speaker: WingyGeneratedMessage["speaker"] | ""; kind: "text"; text: string; labelled: boolean };
  const seen: string[] = [];
  const out: Draft[] = [];
  let open: Draft | null = null;

  for (const line of lines) {
    if (!line) { open = null; continue; }
    if (isNoise(line)) continue;

    const match = LABEL_LINE.exec(line);
    const candidate = match ? stripEmphasis(match[1]).trim() : "";
    if (match && isLabel(candidate)) {
      const body = cleanText(match[2]);
      if (!body) { open = null; continue; }   // a heading such as "Conversation:"
      const entry: Draft = { speaker: speakerFor(candidate, seen) ?? "", kind: "text", text: body, labelled: true };
      out.push(entry);
      open = entry;
      continue;
    }

    const body = cleanText(line);
    if (!body || PREAMBLE.test(body)) continue;
    if (open?.labelled) { open.text = `${open.text} ${body}`.trim(); continue; }  // wrapped line
    const entry: Draft = { speaker: "", kind: "text", text: body, labelled: false };
    out.push(entry);
    open = entry;
  }

  // Unlabelled lines alternate, opening with the person who asked.
  let previous: WingyGeneratedMessage["speaker"] = "wingy";
  for (const entry of out) {
    if (!entry.speaker) entry.speaker = previous === "wingy" ? "user" : "wingy";
    previous = entry.speaker;
  }
  return out.map(({ speaker, kind, text }) => ({ speaker, kind, text })) as WingyGeneratedMessage[];
}

/**
 * Turn a pasted conversation into mockup messages. Accepts the JSON this app's
 * own generator returns, `Wingy:` / `User:` transcripts, markdown bullets or
 * numbered beats, a WhatsApp export's timestamped lines, and plain alternating
 * lines with no labels at all.
 */
export function parseConversationBlob(input: string): WingyGeneratedMessage[] {
  const text = (input ?? "").trim();
  if (!text) return [];
  const parsed = fromJson(text) ?? fromLines(text);
  return parsed
    // The studio owns the chat-export attachment, so drop a pasted one.
    .filter((message) => !(message.kind === "file" || /^[\w .'()-]+\.zip$/i.test(message.text)))
    .filter((message) => message.text.length > 0);
}
