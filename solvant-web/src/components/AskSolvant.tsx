"use client";

import { useEffect, useRef, useState } from "react";
import { BOOKING_URL, BOOKING_CONFIGURED, CTA_LABEL } from "@/lib/content";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi — I'm the Solvant Labs assistant. Ask me about services, pricing, or what automation could look like for your business. I'll keep it short.";

const SUGGESTIONS = [
  { q: "How much does it cost?", label: "Pricing" },
  { q: "What could you automate for me?", label: "What could you automate?" },
  { q: "How does the process work?", label: "How it works" },
];

/**
 * "Ask Solvant" — the site's differentiator (brief §5). A floating widget that
 * calls /api/chat (server-side Anthropic). It keeps history client-side and
 * sends the full history each request (the API is stateless). If the API fails
 * or no key is configured, it degrades to "Chat is offline. Book a call instead:".
 */
export function AskSolvant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: GREETING }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || offline) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.content !== GREETING) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reply?: string; offline?: boolean };
      if (data.offline || !data.reply) {
        setOffline(true);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
      }
    } catch {
      setOffline(true);
    } finally {
      setPending(false);
    }
  }

  const book = BOOKING_CONFIGURED ? (
    <a
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3.5 inline-block rounded-md bg-signal px-3.5 py-2 text-[13px] font-semibold text-white"
    >
      {CTA_LABEL}
    </a>
  ) : (
    <span className="mt-3.5 inline-block rounded-md bg-signal px-3.5 py-2 text-[13px] font-semibold text-white opacity-70">
      {CTA_LABEL}
    </span>
  );

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open Ask Solvant chat"
        onClick={() => setOpen(true)}
        className="fixed bottom-[22px] right-[22px] z-[60] flex items-center gap-2.5 rounded-[30px] bg-signal px-4 py-3 pl-[15px] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(31,111,235,0.34)] transition hover:-translate-y-0.5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 3z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="9" cy="10.5" r="1.1" fill="#fff" />
          <circle cx="12.5" cy="10.5" r="1.1" fill="#fff" />
          <circle cx="16" cy="10.5" r="1.1" fill="#fff" />
        </svg>
        Ask Solvant
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Solvant"
      className="fixed bottom-[22px] right-[22px] z-[61] flex h-[min(560px,calc(100vh-44px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[14px] border border-trace bg-surface shadow-[0_24px_70px_rgba(16,24,32,0.28)]"
    >
      <div className="flex items-center gap-2.5 border-b border-trace px-4 py-3.5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-ink">
          <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="2" y="2" width="18" height="18" rx="4" fill="none" stroke="#1F6FEB" strokeWidth="1.6" />
            <circle cx="7" cy="7" r="1.8" fill="#1F6FEB" />
            <circle cx="15" cy="15" r="1.8" fill="#fff" />
          </svg>
        </div>
        <div>
          <div className="font-display text-[15px] font-bold leading-tight">Ask Solvant</div>
          <div className={`font-mono text-[10px] uppercase tracking-[0.08em] ${offline ? "text-[#b26a00]" : "text-[#2f9e5b]"}`}>
            {offline ? "● offline" : "● AI · online"}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-md px-2 py-1 text-[20px] leading-none text-graphite hover:bg-paper"
        >
          ×
        </button>
      </div>

      <div ref={logRef} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-paper p-4">
        {messages.map((m, k) => (
          <div
            key={k}
            className={`max-w-[84%] whitespace-pre-wrap rounded-xl px-3 py-2.5 text-[14.5px] leading-[1.45] ${
              m.role === "user"
                ? "self-end rounded-br-[4px] bg-signal text-white"
                : "self-start rounded-bl-[4px] border border-trace bg-surface text-ink"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending ? (
          <div className="typing flex gap-1 self-start rounded-xl rounded-bl-[4px] border border-trace bg-surface px-3.5 py-3">
            <i className="h-1.5 w-1.5 rounded-full bg-graphite opacity-50" />
            <i className="h-1.5 w-1.5 rounded-full bg-graphite opacity-50" />
            <i className="h-1.5 w-1.5 rounded-full bg-graphite opacity-50" />
          </div>
        ) : null}
        {offline ? (
          <div className="m-auto max-w-[85%] text-center text-[14.5px] leading-[1.5] text-graphite">
            Chat is offline. Book a call instead:
            <br />
            {book}
          </div>
        ) : null}
      </div>

      {!offline && messages.length <= 1 ? (
        <div className="flex flex-wrap gap-1.5 bg-paper px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.q}
              type="button"
              onClick={() => send(s.q)}
              className="rounded-[20px] border border-trace px-2.5 py-1.5 text-[12.5px] text-signal hover:border-signal"
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {!offline ? (
        <div className="flex gap-2 border-t border-trace bg-surface p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask about services, pricing, fit…"
            aria-label="Message"
            autoComplete="off"
            className="flex-1 rounded-lg border border-trace bg-paper px-3 py-2.5 text-[14px] text-ink"
          />
          <button
            type="button"
            aria-label="Send"
            onClick={() => send(input)}
            disabled={pending}
            className="rounded-lg bg-signal px-3.5 font-semibold text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      ) : null}
    </div>
  );
}
