"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

/**
 * Inline Cal.com scheduler for the Contact page.
 * Needs only your PUBLIC booking link (e.g. "solvantlabs/intro") — no API key.
 * Set NEXT_PUBLIC_CAL_LINK to activate; the Contact page falls back to the
 * plain booking button when it's unset.
 */
export function CalEmbed({ calLink }: { calLink: string }) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal("ui", {
        theme: "light",
        cssVarsPerTheme: { light: { "cal-brand": "#1F6FEB" }, dark: { "cal-brand": "#1F6FEB" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-trace bg-surface">
      <Cal
        calLink={calLink}
        style={{ width: "100%", height: "620px", overflow: "auto" }}
        config={{ layout: "month_view" }}
      />
    </div>
  );
}
