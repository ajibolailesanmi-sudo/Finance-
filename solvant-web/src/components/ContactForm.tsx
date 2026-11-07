"use client";

import { useState } from "react";
import { CONTACT } from "@/lib/content";

type Status = "idle" | "sending" | "sent" | "error" | "offline";

const field =
  "w-full rounded-[8px] border border-trace bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-graphite/55 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";
const label = "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-graphite";

/**
 * Contact form. Posts to /api/contact, which forwards to a form-to-email
 * provider (Web3Forms) server-side. Degrades gracefully to "email us directly"
 * when the provider key isn't configured. Uncontrolled inputs + a honeypot.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      botcheck: String(fd.get("botcheck") || ""),
    };
    if (!payload.name || !payload.email || !payload.message) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-signal bg-surface p-7 shadow-[0_0_0_1px_var(--signal)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal/10 text-signal">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12.5 L10 17.5 L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="font-display text-[20px] font-bold text-ink">Message sent.</h3>
        <p className="text-[15px] text-graphite">
          Thanks — we&apos;ll get back to you within one business day. In a hurry? Email{" "}
          <a href={`mailto:${CONTACT.email}`} className="text-signal hover:text-signal-ink">
            {CONTACT.email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-[12px] border border-trace bg-surface p-7 shadow-[0_1px_0_rgba(16,24,32,0.04)]"
      noValidate
    >
      {/* Honeypot — hidden from humans, catches bots. */}
      <input type="text" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className={label}>
            Name
          </label>
          <input id="cf-name" name="name" required placeholder="Jane Doe" className={field} />
        </div>
        <div>
          <label htmlFor="cf-email" className={label}>
            Email
          </label>
          <input id="cf-email" name="email" type="email" required placeholder="jane@business.com" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="cf-company" className={label}>
          Business <span className="normal-case text-graphite/60">(optional)</span>
        </label>
        <input id="cf-company" name="company" placeholder="Acme Plumbing" className={field} />
      </div>

      <div>
        <label htmlFor="cf-message" className={label}>
          What&apos;s eating your time?
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={5}
          placeholder="Tell us the task or workflow you'd love to stop doing by hand."
          className={`${field} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-1 inline-flex items-center justify-center gap-2 self-start rounded-[8px] bg-signal px-[22px] py-3 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(16,24,32,0.12)] transition hover:-translate-y-px hover:bg-signal-ink hover:shadow-[0_8px_22px_rgba(203,69,15,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>

      {status === "error" ? (
        <p className="text-[14px] text-graphite" role="status">
          Please fill in your name, email, and message — or email us at{" "}
          <a href={`mailto:${CONTACT.email}`} className="text-signal hover:text-signal-ink">
            {CONTACT.email}
          </a>
          .
        </p>
      ) : null}
      {status === "offline" ? (
        <p className="text-[14px] text-graphite" role="status">
          Our form isn&apos;t live yet — please email us directly at{" "}
          <a href={`mailto:${CONTACT.email}`} className="text-signal hover:text-signal-ink">
            {CONTACT.email}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
