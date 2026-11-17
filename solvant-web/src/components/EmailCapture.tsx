"use client";

import { useId, useState } from "react";
import { CONTACT } from "@/lib/content";

type Status = "idle" | "sending" | "sent" | "error" | "offline";

/**
 * One-field email capture. Posts through the same /api/contact route as the
 * contact form (so submissions land in the same inbox), with a fixed note so
 * you can tell them apart. Degrades to "email us" until the form key is set.
 */
export function EmailCapture({
  variant = "light",
  cta = "Get the written plan",
  note = "Email capture: a visitor left their email on the site and wants to hear from us.",
  className = "",
}: {
  variant?: "light" | "dark";
  cta?: string;
  note?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const id = useId();
  const dark = variant === "dark";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const email = String(fd.get("email") || "").trim();
    const botcheck = String(fd.get("botcheck") || "");
    if (!email) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Website visitor", email, company: "", message: note, botcheck }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; offline?: boolean };
      if (data.offline) {
        setStatus("offline");
        return;
      }
      if (!res.ok || !data.ok) throw new Error("failed");
      formEl.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const muted = dark ? "text-[#dfe6ea]" : "text-graphite";

  if (status === "sent") {
    return <p className={`text-[15px] ${muted} ${className}`}>Thanks &mdash; we&apos;ll be in touch within one business day.</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`flex w-full max-w-[480px] flex-wrap gap-2.5 ${className}`}>
      <input type="text" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label htmlFor={id} className="sr-only">
        Email
      </label>
      <input
        id={id}
        name="email"
        type="email"
        required
        placeholder="you@business.com"
        className={`min-w-0 flex-1 basis-[170px] rounded-[8px] border px-3.5 py-3 text-[15px] outline-none focus:ring-2 ${
          dark
            ? "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-signal focus:ring-[rgba(203,69,15,0.3)]"
            : "border-trace bg-surface text-ink placeholder:text-[#8e979f] focus:border-signal focus:ring-[rgba(203,69,15,0.22)]"
        }`}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-[8px] bg-signal px-5 py-3 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(16,24,32,0.12)] transition hover:-translate-y-px hover:bg-signal-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : cta}
      </button>
      {status === "error" || status === "offline" ? (
        <p className={`basis-full text-[13px] ${muted}`} role="status">
          {status === "offline" ? "Our form isn't live yet — " : "Please enter a valid email, or "}
          email{" "}
          <a href={`mailto:${CONTACT.email}`} className="underline hover:text-signal">
            {CONTACT.email}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
