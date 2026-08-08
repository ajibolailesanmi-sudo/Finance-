import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { Eyebrow, SectionHead, Hr } from "@/components/ui";
import { STEPS, RIGOR, FAQ } from "@/lib/content";

export const metadata: Metadata = {
  title: "Process | Solvant Labs",
  description:
    "How Solvant Labs builds automation: Map, Build, Run — documented, tested, and monitored, with quality-operations discipline. Plus common questions answered.",
};

export default function ProcessPage() {
  return (
    <>
      <section className="paper-grid py-[clamp(46px,6vw,80px)] pb-[clamp(30px,4vw,44px)]">
        <div className="mx-auto max-w-wrap px-6">
          <Eyebrow>Process</Eyebrow>
          <h1 className="my-4 max-w-[18ch] text-[clamp(30px,4.6vw,48px)] leading-[1.06]">
            Documented, tested, monitored — not duct-taped demos.
          </h1>
          <p className="max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-graphite">
            Solvant Labs brings 8+ years of regulated quality-operations discipline (pharma and cell therapy) to automation, where &ldquo;it usually works&rdquo; is not an acceptable standard.
          </p>
        </div>
      </section>

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.t} className="border-t-2 border-ink pt-6">
                <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-signal">{s.k}</div>
                <h3 className="my-2.5 text-[21px]">{s.t}</h3>
                <p className="text-[15px] text-graphite">{s.p}</p>
                <ul className="mt-3 list-disc pl-4 text-[14.5px] text-graphite">
                  {s.detail.map((d) => (
                    <li key={d} className="my-1.5">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="Why it holds up" title="The engineering rigor, in three habits." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {RIGOR.map((r) => (
              <div key={r.m} className="rounded-[10px] border border-trace bg-surface p-6">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{r.m}</div>
                <h3 className="mb-2 text-[18px]">{r.t}</h3>
                <p className="text-[14.5px] text-graphite">{r.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="FAQ" title="The questions we usually get." />
          <div className="max-w-[760px]">
            {FAQ.map((f) => (
              <details key={f.q} className="border-b border-trace py-1.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[18px] font-medium marker:hidden">
                  {f.q}
                  <span className="font-mono text-[22px] text-signal transition group-open:hidden">+</span>
                </summary>
                <p className="max-w-[66ch] pb-4 text-[15px] text-graphite">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <CTAButton />
          </div>
        </div>
      </section>
    </>
  );
}
