import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { BOOKING_URL } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Config (edit here) ----------------------------------------------------
const MODEL = "claude-opus-5"; // Fast FAQ bot; swap to "claude-haiku-4-5" to cut cost.
const MAX_TOKENS = 600; // Deliberately short — the widget is meant to be concise.
const MAX_MESSAGES = 24; // Cap history length sent to the API.
const MAX_CHARS = 2000; // Cap per-message length.
const RATE_LIMIT = 15; // Requests per IP per window.
const WINDOW_MS = 60_000;

// System prompt (brief §5), with the booking URL injected from one constant.
const SYSTEM = `You are the assistant for Solvant Labs, an AI automation studio for US small businesses. You answer questions about services (Pilot Automation from $500, Custom AI Agent from $1,500, Care Plan from $300/month), what automation could look like for the visitor's business, and how the process works. Be concise, concrete, and honest. If you don't know something, say so. Never fabricate case studies, clients, or guarantees. Your goal is to be genuinely helpful for a minute or two, then suggest booking the 15-minute intro call at ${BOOKING_URL}. Do not discuss topics unrelated to Solvant Labs or business automation; politely redirect. Keep replies to a few short sentences.`;

// ---- Light in-memory rate limit (best-effort; per serverless instance) -----
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return arr.length > RATE_LIMIT;
}

type InMsg = { role: unknown; content: unknown };

export async function POST(req: NextRequest) {
  // Graceful degradation: no key configured → widget shows the booking fallback.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ offline: true });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { reply: "One moment — you're sending messages a little fast. Try again in a few seconds, or just book a quick call." },
      { status: 429 }
    );
  }

  let body: { messages?: InMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const messages = (body.messages || [])
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" }, // no tools + concise Q&A → skip thinking for latency
      system: SYSTEM,
      messages,
    });

    if (resp.stop_reason === "refusal") {
      return NextResponse.json({
        reply: "I can't help with that one — but I'm happy to talk through what automation could do for your business, or you can book a quick call.",
      });
    }

    const reply = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ reply: reply || "Happy to help — could you rephrase that?" });
  } catch (err) {
    // Any API failure → degrade gracefully; the widget shows the booking link.
    console.error("[ask-solvant] chat error", err);
    return NextResponse.json({ offline: true }, { status: 200 });
  }
}
