import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { CalEmbed } from "@/components/CalEmbed";
import { Eyebrow } from "@/components/ui";
import { EXPECT, CONTACT, BOOKING_URL, BOOKING_CONFIGURED } from "@/lib/content";

// Public Cal.com booking link, e.g. "solvantlabs/intro" (no API key needed).
const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK;

export const metadata: Metadata = {
  title: "Contact | Solvant Labs",
  description:
    "Book a 15-minute intro call with Solvant Labs. No form — just grab a time. You'll leave with at least one automation idea you can use.",
};

export default function ContactPage() {
  return (
    <>
      <section className="paper-grid py-[clamp(46px,6vw,80px)] pb-[clamp(30px,4vw,44px)]">
        <div className="mx-auto max-w-wrap px-6">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="my-4 max-w-[18ch] text-[clamp(30px,4.6vw,48px)] leading-[1.06]">Book a 15-minute intro call.</h1>
          <p className="max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-graphite">
            No form to fill out — just grab a time. You&apos;ll leave with at least one automation idea you can use, whether or not we work together.
          </p>
        </div>
      </section>

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto grid max-w-wrap grid-cols-1 items-start gap-10 px-6 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Eyebrow>What to expect</Eyebrow>
            <ul className="mt-4 flex flex-col gap-3.5">
              {EXPECT.map((e) => (
                <li key={e} className="relative pl-6 text-[15.5px] text-graphite">
                  <span className="absolute left-0 top-[8px] h-2.5 w-2.5 rounded-full bg-signal" />
                  {e}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2.5 text-[14.5px] text-graphite">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-graphite">Solvant Labs</span> · {CONTACT.address}
              </div>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-graphite">Email</span> · {CONTACT.email}
              </div>
            </div>
          </div>

          {CAL_LINK ? (
            <CalEmbed calLink={CAL_LINK} />
          ) : (
            <div className="rounded-xl border border-trace bg-surface p-6">
              <div className="rounded-[10px] border border-dashed border-trace bg-paper p-6 text-center">
                <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-graphite">
                  {BOOKING_CONFIGURED ? "Book below" : "Cal.com embed · set NEXT_PUBLIC_CAL_LINK"}
                </div>
                <div className="mb-1 font-display text-[20px] font-bold">Pick a time</div>
                <p className="mb-4 text-[14px] text-graphite">
                  {BOOKING_CONFIGURED
                    ? "Opens the scheduler in a new tab."
                    : "Add your Cal.com link and this becomes a live inline scheduler."}
                </p>
                <CTAButton full />
              </div>
              {BOOKING_CONFIGURED ? (
                <p className="mt-3 text-center font-mono text-[11px] text-graphite">{BOOKING_URL}</p>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
