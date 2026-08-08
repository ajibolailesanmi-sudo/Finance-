import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Solvant Labs — AI Agents and Automation for Small Businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded OG card matching the design tokens (brief §6, §7).
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F8F6",
          backgroundImage:
            "linear-gradient(#E9ECE9 1px, transparent 1px), linear-gradient(90deg, #E9ECE9 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, border: "3px solid #1F6FEB" }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#101820", letterSpacing: "-0.01em" }}>Solvant Labs</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#4A5560",
            }}
          >
            AI automation studio · US small business
          </div>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              color: "#101820",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 940,
            }}
          >
            Your business, running while you&apos;re not watching it.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#4A5560", fontSize: 24 }}>
          <span style={{ color: "#1F6FEB", fontWeight: 700 }}>Lead in</span>
          <span>→ Agent → CRM →</span>
          <span style={{ color: "#1F6FEB", fontWeight: 700 }}>Reply sent</span>
        </div>
      </div>
    ),
    size
  );
}
