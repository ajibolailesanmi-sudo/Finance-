import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { display, body, mono } from "@/lib/fonts";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AskSolvant } from "@/components/AskSolvant";
import "./globals.css";

const SITE_URL = "https://solvantlabs.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Solvant Labs | AI Agents and Automation for Small Businesses",
  description:
    "Solvant Labs builds AI agents and workflow automations for US small businesses: instant lead follow-up, AI reception, document processing, and operations that run after hours.",
  openGraph: {
    title: "Solvant Labs | AI Agents and Automation for Small Businesses",
    description:
      "Custom AI agents and automations for US small businesses. Fixed-price, documented, tested, and monitored.",
    url: SITE_URL,
    siteName: "Solvant Labs",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
        <AskSolvant />
        <Analytics />
      </body>
    </html>
  );
}
