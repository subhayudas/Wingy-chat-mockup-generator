import { NextResponse } from "next/server";
import {
  validateWingyConversation,
  WINGY_MAX_MESSAGES,
  WINGY_MAX_SECONDS,
  WINGY_MIN_SECONDS,
  WINGY_RUNTIME_SYSTEM_PROMPT,
  type WingyTone,
} from "@/lib/wingy-conversation";

export const runtime = "nodejs";
// One generation is ~4s, and a rejected draft is retried below, so give the
// function room for the worst case rather than Vercel's short default.
export const maxDuration = 60;

// DeepSeek honours the prompt's 5–6 message contract about half the time — it
// usually overshoots by one message. Re-asking is cheaper and far more
// reliable than loosening the contract the prompt states.
const MAX_ATTEMPTS = 3;

type GenerateRequest = {
  theme?: string;
  tone?: WingyTone;
  target_seconds?: number;
  context?: string;
};

function responseText(payload: Record<string, unknown>) {
  const choices = payload.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The model returned no conversation text.");
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

// The prompt quotes an example attachment object before the envelope it wants,
// and a model that echoes both emits two JSON documents in one response. Walk
// the top-level objects and take the first that actually carries `messages`.
function parseEnvelope(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    let depth = 0, start = -1, inString = false, escaped = false;
    for (let i = 0; i < text.length; i += 1) {
      const character = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") { if (depth === 0) start = i; depth += 1; }
      else if (character === "}") {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          try {
            const candidate = JSON.parse(text.slice(start, i + 1));
            if (Array.isArray(candidate?.messages)) return candidate;
          } catch { /* keep scanning */ }
        }
      }
    }
    throw new Error("The model returned no parseable conversation JSON.");
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.AZURE_AI_FOUNDRY_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Conversation generation is not configured. Add AZURE_AI_FOUNDRY_KEY to the server environment." },
      { status: 503 },
    );
  }

  let input: GenerateRequest;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const theme = input.theme?.trim();
  if (!theme || theme.length > 600) {
    return NextResponse.json({ error: "Enter a video hook between 1 and 600 characters." }, { status: 400 });
  }

  const tone = input.tone ?? "sassy_plus_plus";
  const targetSeconds = Math.min(WINGY_MAX_SECONDS, Math.max(WINGY_MIN_SECONDS, Math.round(input.target_seconds ?? 28)));
  const model = process.env.AZURE_AI_FOUNDRY_MODEL || "DeepSeek-V4-Flash";
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || "https://ai-wingy.services.ai.azure.com";

  const attempt = async () => {
    const upstream = await fetch(`${endpoint.replace(/\/$/, "")}/models/chat/completions?api-version=2024-05-01-preview`, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: WINGY_RUNTIME_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              theme,
              tone,
              target_seconds: targetSeconds,
              attachment_type: "chat_export",
              // The prompt only licenses the invented statistics it is built
              // around when the caller marks the run as staged.
              data_mode: "staged",
              // DeepSeek reads the prompt's "5–6 messages" as a soft hint and
              // lands on 7–8, so the caller restates the budget as data.
              messages_after_attachment: WINGY_MAX_MESSAGES - 1,
              total_messages_including_attachment: WINGY_MAX_MESSAGES,
              ...(input.context?.trim() ? { context: input.context.trim().slice(0, 1200) } : {}),
            }),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 1800,
      }),
    });

    const payload = await upstream.json() as Record<string, unknown>;
    if (!upstream.ok) {
      const apiError = payload.error as { message?: string } | undefined;
      throw new Error(apiError?.message || `Azure AI Foundry request failed (${upstream.status}).`);
    }
    return validateWingyConversation(parseEnvelope(responseText(payload)), {
      hook: theme,
      tone,
      target_seconds: targetSeconds,
      attachment_type: "chat_export",
    });
  };

  let lastError: unknown;
  for (let tries = 0; tries < MAX_ATTEMPTS; tries += 1) {
    try {
      return NextResponse.json(await attempt());
    } catch (error) {
      lastError = error;
      console.error(`Wingy conversation attempt ${tries + 1} failed`, error);
      // An upstream refusal (bad key, dead deployment) will not fix itself.
      if (error instanceof Error && error.message.startsWith("Azure AI Foundry")) break;
    }
  }
  return NextResponse.json(
    { error: lastError instanceof Error ? lastError.message : "Conversation generation failed." },
    { status: 502 },
  );
}
