"use client";

import { useEffect, useState } from "react";
import { BOOKING_URL, BOOKING_CONFIGURED, CTA_LABEL } from "@/lib/content";

/**
 * Full-width "Book a call" bar pinned to the bottom on mobile — the conversion
 * bar wesucceed shows on phones. Slides in once you've scrolled past the hero,
 * and is hidden on desktop (md+). The chat FAB is lifted above it on mobile.
 */
export function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!BOOKING_CONFIGURED) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-trace bg-paper/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-signal px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(31,111,235,0.3)]"
      >
        {CTA_LABEL}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
