import { Schematic } from "@/components/Schematic";
import { Reveal } from "@/components/Reveal";
import { CTAButton } from "@/components/CTA";
import { Eyebrow, SectionHead, ArrowLink, Hr } from "@/components/ui";
import {
  HERO,
  PROBLEMS,
  SERVICES,
  SERVICES_LEDE,
  STEPS,
  CASES,
  FINAL_CTA,
} from "@/lib/content";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="paper-grid relative overflow-hidden" aria-label="Intro">
        <div className="mx-auto grid max-w-wrap grid-cols-1 items-center gap-9 px-6 py-[clamp(44px,6vw,90px)] md:grid-cols-[1.02fr_0.98fr] md:gap-14">
          <div>
            <Eyebrow>{HERO.eyebrow}</Eyebrow>
            <h1 className="mb-5 mt-4 max-w-[15ch] text-[clamp(32px,5.2vw,56px)] leading-[1.04]">{HERO.headline}</h1>
            <p className="mb-7 max-w-[52ch] text-[clamp(16px,1.6vw,19px)] text-graphite">{HERO.subhead}</p>
            <div className="flex flex-wrap items-center gap-5">
              <CTAButton />
              <a
                href="#services-preview"
                className="border-b border-trace pb-0.5 text-[15px] text-graphite after:content-['_↓'] hover:border-signal hover:text-signal"
              >
                {HERO.secondary}
              </a>
            </div>
          </div>
          <Schematic />
        </div>
      </section>

      {/* PROBLEM STRIP */}
      <section className="bg-ink text-paper" aria-label="The problem">
        <Reveal className="mx-auto max-w-wrap px-6 py-[clamp(52px,7vw,96px)]">
          <span className="inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.16em] text-[#9aa6b0] before:h-px before:w-6 before:bg-signal before:content-['']">
            Where the hours and leads leak out
          </span>
          <div className="mt-6 grid grid-cols-1 border-t border-white/15 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <div
                key={p.k}
                className={`border-white/15 py-6 pr-0 font-display text-[clamp(16px,1.7vw,19px)] font-medium leading-[1.4] md:pr-6 ${
                  i < PROBLEMS.length - 1 ? "border-b md:border-b-0 md:border-r" : ""
                }`}
              >
                <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-signal">{p.k}</span>
                {p.t}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* SERVICES PREVIEW */}
      <section id="services-preview" aria-label="Services" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="What we build" title="Three productized offers. Fixed prices, so you know what you're getting." lede={SERVICES_LEDE} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {SERVICES.map((s) => (
              <Reveal
                key={s.tier}
                className={`flex flex-col rounded-[10px] border bg-surface p-7 transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(16,24,32,0.07)] ${
                  s.feature ? "border-signal shadow-[0_0_0_1px_var(--signal)]" : "border-trace hover:border-[#c4d3ec]"
                }`}
              >
                {s.feature ? (
                  <span className="mb-3.5 self-start rounded-[20px] border border-signal px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
                    Most popular
                  </span>
                ) : null}
                <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-graphite">{s.tier}</div>
                <div className="mb-1.5 font-mono text-[14px] text-signal">{s.price}</div>
                <h3 className="mb-1.5 text-[22px]">{s.heading}</h3>
                <p className="text-[15px] leading-[1.55] text-graphite">{s.blurb}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-6 flex justify-center">
            <ArrowLink href="/services">See full services</ArrowLink>
          </Reveal>
        </div>
      </section>

      <Hr />

      {/* PROCESS PREVIEW */}
      <section aria-label="How it works" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="How it works" title="Three steps, and most of the work is on us." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <Reveal key={s.t} className="border-t-2 border-ink pt-6">
                <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-signal">{s.k}</div>
                <h3 className="my-2.5 text-[21px]">{s.t}</h3>
                <p className="text-[15px] text-graphite">{s.p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-6 flex justify-center">
            <ArrowLink href="/process">See the full process</ArrowLink>
          </Reveal>
        </div>
      </section>

      <Hr />

      {/* WORK PREVIEW */}
      <section aria-label="Work" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="Selected work" title="Client builds we can walk you through, end to end." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {CASES.map((c) => (
              <Reveal key={c.title} className="flex flex-col gap-3.5 rounded-[10px] border border-trace bg-surface p-7">
                <span className="self-start rounded border border-trace bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-graphite">
                  {c.tag}
                </span>
                <h3 className="text-[20px]">{c.title}</h3>
                <p className="text-[14.5px] leading-[1.5] text-graphite">{c.built}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-6 flex justify-center">
            <ArrowLink href="/work">See the work in detail</ArrowLink>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-ink text-center text-paper" aria-label="Book a call">
        <Reveal className="mx-auto max-w-wrap px-6 py-[clamp(52px,7vw,96px)]">
          <h2 className="mx-auto mb-3.5 max-w-[22ch] text-[clamp(24px,3.4vw,34px)] text-white">{FINAL_CTA.headline}</h2>
          <p className="mx-auto mb-7 max-w-[46ch] text-[17px] text-[#b6c0c9]">{FINAL_CTA.sub}</p>
          <CTAButton className="!px-6 !py-4 !text-[16px]" />
        </Reveal>
      </section>
    </>
  );
}
