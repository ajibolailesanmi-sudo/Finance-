import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { CalEmbed } from "@/components/CalEmbed";
import { ContactForm } from "@/components/ContactForm";
import { Faq } from "@/components/Faq";
import { PageHero } from "@/components/PageHero";
import { SectionHead, Hr } from "@/components/ui";
import { EXPECT, CONTACT, ADDRESS_SET, CAL_LINK, FAQ } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact | Solvant Labs",
  description:
    "Get in touch with Solvant Labs. Send a message or book a 15-minute intro call — you'll leave with at least one automation idea you can use.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="Contact"
        title="Let's get in touch."
        rotating={["Send us a message.", "Grab a time.", "Ask us anything."]}
        lede="Tell us what's eating your time and we'll tell you what we'd automate first — by message, or on a quick call. No pitch deck either way."
      />

      {/* GET IN TOUCH — form + details */}
      <section className="py-[clamp(52px,7vw,96px)]" aria-label="Send a message">
        <div className="mx-auto grid max-w-wrap grid-cols-1 items-start gap-10 px-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="mb-1.5 text-[clamp(22px,2.8vw,28px)]">Send us a message</h2>
            <p className="mb-6 max-w-[46ch] text-[15.5px] text-graphite">
              A few lines about your business and the work you&apos;d love to stop doing by hand. We reply within one business day.
            </p>
            <ContactForm />
          </div>

          <div className="flex flex-col gap-7 md:pt-1">
            <div>
              <h3 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-graphite">
                Reach us directly
              </h3>
              <div className="flex flex-col gap-2 text-[15px] text-graphite">
                <a href={`mailto:${CONTACT.email}`} className="hover:text-signal">
                  {CONTACT.email}
                </a>
                {ADDRESS_SET ? <div>Solvant Labs · {CONTACT.address}</div> : null}
                <div className="text-[13.5px] text-graphite/80">We reply within one business day.</div>
              </div>
            </div>

            <div className="rounded-[12px] border border-trace bg-surface p-6">
              <h3 className="mb-1.5 font-display text-[18px] font-bold text-ink">Prefer to talk?</h3>
              <p className="mb-4 text-[14.5px] text-graphite">
                Grab a 15-minute intro call. You&apos;ll leave with at least one automation idea you can use, whether or not we work together.
              </p>
              <CTAButton full />
            </div>

            <div>
              <h3 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-graphite">
                What to expect
              </h3>
              <ul className="flex flex-col gap-3">
                {EXPECT.map((e) => (
                  <li key={e} className="relative pl-6 text-[14.5px] text-graphite">
                    <span className="absolute left-0 top-[8px] h-2 w-2 rounded-full bg-signal" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {CAL_LINK ? (
        <>
          <Hr />
          <section className="py-[clamp(52px,7vw,96px)]" aria-label="Book a call">
            <div className="mx-auto max-w-wrap px-6">
              <SectionHead
                eyebrow="Book a call"
                title="Or grab a time right now."
                lede="Pick a slot that works and we'll meet you there — no form required."
              />
              <CalEmbed calLink={CAL_LINK} />
            </div>
          </section>
        </>
      ) : null}

      <Hr />

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead
            eyebrow="FAQ"
            title="Frequently asked questions"
            lede="The things people usually want to know before reaching out. Still unsure? Bring it to the call."
          />
          <Faq items={FAQ} />
        </div>
      </section>
    </>
  );
}
