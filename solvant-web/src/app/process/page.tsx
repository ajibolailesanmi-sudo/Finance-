import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { Faq } from "@/components/Faq";
import { PageHero } from "@/components/PageHero";
import { SectionHead, Hr } from "@/components/ui";
import { STEPS, RIGOR, FAQ } from "@/lib/content";

export const metadata: Metadata = {
  title: "Process | Solvant Labs",
  description:
    "How Solvant Labs builds automation: Map, Build, Run — documented, tested, and monitored, with quality-operations discipline. Plus common questions answered.",
};

export default function ProcessPage() {
  return (
    <>
      <PageHero
        kicker="Map. Build. Run."
        title="Documented, tested, monitored — not duct-taped demos."
        rotating={[
          "Mapped in a 15-minute call.",
          "Built and tested before go-live.",
          "Monitored after launch.",
        ]}
        lede={
          "Solvant Labs brings 8+ years of regulated quality-operations discipline (pharma and cell therapy) to automation, where “it usually works” is not an acceptable standard."
        }
      />

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
          <Faq items={FAQ} />
          <div className="mt-8 flex justify-center">
            <CTAButton />
          </div>
        </div>
      </section>
    </>
  );
}
