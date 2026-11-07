import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Config ----------------------------------------------------------------
// Submissions are forwarded to Web3Forms (https://web3forms.com), a free
// form-to-email service. Set WEB3FORMS_ACCESS_KEY in the environment to the
// access key tied to the destination inbox (info@solvantlabs.com). Until it's
// set, the route reports { offline: true } and the form tells visitors to email.
const RATE_LIMIT = 5; // submissions per IP per window
const WINDOW_MS = 60_000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---- Light in-memory rate limit (best-effort; per serverless instance) -----
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return NextResponse.json({ offline: true });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many submissions. Try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, 200);
  const email = String(body.email || "").trim().slice(0, 200);
  const company = String(body.company || "").trim().slice(0, 200);
  const message = String(body.message || "").trim().slice(0, 5000);
  const botcheck = String(body.botcheck || "");

  // Honeypot: a real user never fills this. Pretend success, send nothing.
  if (botcheck) return NextResponse.json({ ok: true });

  if (!name || !message || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide your name, a valid email, and a message." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `New contact message from ${name}`,
        from_name: "Solvant Labs website",
        replyto: email,
        name,
        email,
        business: company || "—",
        message,
      }),
    });
    if (!res.ok) throw new Error(`web3forms ${res.status}`);
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    if (!data.success) throw new Error("web3forms rejected");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send right now. Please email us instead." }, { status: 502 });
  }
}
