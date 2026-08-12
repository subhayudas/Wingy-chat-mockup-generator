import { NextResponse } from "next/server";
import {
  validateWingyConversation,
  WINGY_OUTPUT_SCHEMA,
  WINGY_RUNTIME_SYSTEM_PROMPT,
  type WingyTone,
} from "@/lib/wingy-conversation";

export const runtime = "nodejs";

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
  const targetSeconds = Math.min(40, Math.max(18, Math.round(input.target_seconds ?? 28)));
  const model = process.env.AZURE_AI_FOUNDRY_MODEL || "DeepSeek-V4-Flash";
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || "https://ai-wingy.services.ai.azure.com";

  try {
    const upstream = await fetch(`${endpoint.replace(/\/$/, "")}/models/chat/completions?api-version=2024-05-01-preview`, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `${WINGY_RUNTIME_SYSTEM_PROMPT}\n\nReturn only JSON matching this schema exactly:\n${JSON.stringify(WINGY_OUTPUT_SCHEMA)}` },
          {
            role: "user",
            content: JSON.stringify({
              theme,
              tone,
              target_seconds: targetSeconds,
              attachment_type: "chat_export",
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
    const conversation = validateWingyConversation(JSON.parse(responseText(payload)));
    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Wingy conversation generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversation generation failed." },
      { status: 502 },
    );
  }
}
