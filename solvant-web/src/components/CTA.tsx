"use client";

import { useState } from "react";
import { BOOKING_URL, BOOKING_CONFIGURED, CTA_LABEL } from "@/lib/content";

/**
 * The single conversion path. Every CTA reads BOOKING_URL (brief §3).
 * When the URL is still a [FILL] placeholder, we show a toast instead of
 * navigating to a dead link — nothing ships silently broken.
 */
export function CTAButton({
  className = "",
  label = CTA_LABEL,
  full = false,
}: {
  className?: string;
  label?: string;
  full?: boolean;
}) {
  const [toast, setToast] = useState(false);

  const base =
    "inline-block rounded-[7px] bg-signal px-[22px] py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(16,24,32,0.12)] transition hover:-translate-y-px hover:bg-signal-ink hover:shadow-[0_8px_22px_rgba(31,111,235,0.26)] active:translate-y-0";

  if (BOOKING_CONFIGURED) {
    return (
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${full ? "w-full text-center" : ""} ${className}`}
      >
        {label}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setToast(true);
          setTimeout(() => setToast(false), 2600);
        }}
        className={`${base} ${full ? "w-full text-center" : ""} ${className}`}
      >
        {label}
      </button>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 font-mono text-[12.5px] text-white shadow-[0_12px_34px_rgba(0,0,0,0.3)]"
        >
          Set NEXT_PUBLIC_BOOKING_URL to enable booking
        </div>
      ) : null}
    </>
  );
}
