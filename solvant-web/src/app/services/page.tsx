import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { Eyebrow } from "@/components/ui";
import { SERVICES, SERVICES_NOTE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services | Solvant Labs",
  description:
    "Three fixed-price automation offers for US small businesses: Pilot Automation from $500, Custom AI Agent from $1,500, and a $300/month Care Plan.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="paper-grid py-[clamp(46px,6vw,80px)] pb-[clamp(30px,4vw,44px)]">
        <div className="mx-auto max-w-wrap px-6">
          <Eyebrow>Services</Eyebrow>
          <h1 className="my-4 max-w-[18ch] text-[clamp(30px,4.6vw,48px)] leading-[1.06]">
            Fixed-price automation, built like it matters.
          </h1>
          <p className="max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-graphite">
            No hourly surprises and no open-ended retainers to start. Pick where you want to begin — we&apos;ll tell you honestly on the call which one fits.
          </p>
        </div>
      </section>

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {SERVICES.map((s, i) => (
              <div
                key={s.tier}
                className={`flex flex-col gap-3.5 rounded-xl border bg-surface p-7 ${
                  s.feature ? "border-signal shadow-[0_0_0_1px_var(--signal)]" : "border-trace"
                } ${i === 2 ? "md:col-span-2" : ""}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[24px]">{s.tier}</h3>
                  <div className="font-mono text-[15px] text-signal">{s.price}</div>
                </div>
                <p className="text-[15.5px] text-graphite">{s.blurb}</p>
                <ul className="flex flex-col gap-2.5">
                  {s.includes.map((it) => (
                    <li key={it} className="relative pl-6 text-[14.5px] text-ink">
                      <span className="absolute left-0 top-[7px] h-3 w-3 rounded-[3px] border-[1.5px] border-signal" />
                      <span className="absolute left-[4px] top-[8px] h-[7px] w-[4px] rotate-[40deg] border-b-2 border-r-2 border-signal" />
                      {it}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-trace pt-3.5 font-mono text-[11.5px] tracking-[0.06em] text-graphite">
                  {s.ideal}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-7 text-center text-[16px] text-graphite">{SERVICES_NOTE}</p>
          <div className="mt-6 flex justify-center">
            <CTAButton />
          </div>
        </div>
      </section>
    </>
  );
}
