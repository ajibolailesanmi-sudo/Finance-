import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";
import { CONTACT } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy Policy | Solvant Labs",
  description: "How Solvant Labs handles data on solvantlabs.com.",
};

export default function PrivacyPage() {
  return (
    <>
      <section className="paper-grid py-[clamp(46px,6vw,80px)] pb-[clamp(30px,4vw,44px)]">
        <div className="mx-auto max-w-wrap px-6">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="my-4 text-[clamp(30px,4.6vw,48px)] leading-[1.06]">Privacy Policy</h1>
        </div>
      </section>

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <div className="max-w-[720px]">
            <div className="mb-5 font-mono text-[11px] tracking-[0.06em] text-graphite">
              Solvant Labs · last updated [FILL: date]
            </div>
            <p className="mb-2 text-[15px] text-graphite">
              Solvant Labs is an AI automation studio serving US small businesses. This policy explains what we collect when you visit this site and how to reach us about it.
            </p>

            <h3 className="mb-1.5 mt-6 text-[18px]">What we collect</h3>
            <p className="mb-2 text-[15px] text-graphite">
              This website uses Vercel Analytics, which records aggregate, privacy-friendly usage data (page views, referrers, country) without cookies or cross-site tracking. If you start a chat in the &ldquo;Ask Solvant&rdquo; widget, your messages are processed to generate a reply and are not sold or used for advertising.
            </p>

            <h3 className="mb-1.5 mt-6 text-[18px]">Booking a call</h3>
            <p className="mb-2 text-[15px] text-graphite">
              When you book an intro call, scheduling details are handled by our calendar provider under their own privacy terms.
            </p>

            <h3 className="mb-1.5 mt-6 text-[18px]">Your choices</h3>
            <p className="mb-2 text-[15px] text-graphite">
              You can use the site without booking or chatting. To request deletion of any information you&apos;ve shared, email {CONTACT.email}.
            </p>

            <h3 className="mb-1.5 mt-6 text-[18px]">Contact</h3>
            <p className="mb-2 text-[15px] text-graphite">
              Questions about this policy? Email {CONTACT.email} or write to Solvant Labs, {CONTACT.address}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
