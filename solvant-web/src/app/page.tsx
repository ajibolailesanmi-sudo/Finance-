import Link from "next/link";
import { Schematic } from "@/components/Schematic";
import { Reveal } from "@/components/Reveal";
import { CTAButton } from "@/components/CTA";
import { Typewriter } from "@/components/Typewriter";
import { SectionHead, ArrowLink, Hr } from "@/components/ui";
import {
  HERO,
  TOOLS,
  TOOLS_LABEL,
  STATS,
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
        <div className="mx-auto grid max-w-wrap grid-cols-1 items-center gap-10 px-6 py-[clamp(48px,7vw,104px)] md:grid-cols-[1.05fr_0.95fr] md:gap-14">
          <div>
            <div className="mb-5 font-mono text-[12px] font-medium uppercase tracking-[0.2em] text-graphite">
              {HERO.kicker}
            </div>
            <h1 className="max-w-[16ch] text-[clamp(34px,6.1vw,64px)] font-bold leading-[1.02] tracking-[-0.025em]">
              {HERO.headline}
            </h1>
            <div className="mt-4 min-h-[2.5em] font-display text-[clamp(20px,3.2vw,30px)] font-bold leading-[1.15] text-signal sm:min-h-[1.3em]">
              <Typewriter phrases={HERO.rotating} />
            </div>
            <p className="mt-5 max-w-[52ch] text-[clamp(16px,1.6vw,19px)] text-graphite">{HERO.subhead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <CTAButton />
              <Link
                href="/work"
                className="group inline-flex items-center gap-3 text-[15px] font-semibold text-ink"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-trace bg-surface text-signal transition group-hover:-translate-y-0.5 group-hover:border-signal group-hover:shadow-[0_8px_22px_rgba(203,69,15,0.18)]">
                  <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 2 L11.5 7 L3 12 Z" fill="currentColor" />
                  </svg>
                </span>
                {HERO.secondary}
              </Link>
            </div>
            <div className="mt-9 inline-flex items-center gap-3.5 rounded-[11px] border border-trace bg-surface px-4 py-3 shadow-[0_1px_0_rgba(16,24,32,0.04)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-signal/10 text-signal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2.5 L20 6 V11 C20 16 16.6 19.5 12 21.5 C7.4 19.5 4 16 4 11 V6 Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path d="M8.5 11.8 L11 14.2 L15.6 9.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="leading-tight">
                <div className="font-display text-[14.5px] font-bold text-ink">{HERO.badge.title}</div>
                <div className="text-[12.5px] text-graphite">{HERO.badge.sub}</div>
              </div>
            </div>
          </div>
          <Schematic />
        </div>
      </section>

      {/* TOOLS STRIP */}
      <section aria-label="Tools we build with" className="border-y border-trace bg-surface">
        <div className="mx-auto flex max-w-wrap flex-col items-center gap-5 px-6 py-7 md:flex-row md:justify-between md:gap-8">
          <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-graphite">
            {TOOLS_LABEL}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 md:justify-end">
            {TOOLS.map((t) => (
              <span key={t} className="font-display text-[15px] font-semibold text-graphite/75">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM STRIP */}
      <section className="bg-ink text-paper" aria-label="The problem">
        <Reveal className="mx-auto max-w-wrap px-6 py-[clamp(52px,7vw,96px)]">
          <span className="inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.16em] text-[#9aa6b0] before:h-px before:w-6 before:bg-signal before:content-['']">
            Where the hours and leads leak out
          </span>
          <div className="mt-6 grid grid-cols-1 border-t border-white/15 md:grid-cols-3">
            {PROBLEMS.map((p, i) => {
              const pad =
                i === 0 ? "md:pr-7" : i === PROBLEMS.length - 1 ? "md:pl-7" : "md:px-7";
              return (
                <div
                  key={p.k}
                  className={`border-white/15 py-6 font-display text-[clamp(16px,1.7vw,19px)] font-medium leading-[1.4] ${pad} ${
                    i < PROBLEMS.length - 1 ? "border-b md:border-b-0 md:border-r" : ""
                  }`}
                >
                  <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                    {p.k}
                  </span>
                  {p.t}
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* STATS BAND */}
      <section aria-label="By the numbers" className="border-b border-trace py-[clamp(44px,6vw,72px)]">
        <div className="mx-auto max-w-wrap px-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4">
            {STATS.map((s) => (
              <Reveal key={s.v} className="border-l-2 border-signal pl-4">
                <div className="font-display text-[clamp(28px,4vw,40px)] font-bold leading-none tracking-[-0.02em] text-ink">
                  {s.k}
                </div>
                <div className="mt-2.5 text-[14px] leading-[1.4] text-graphite">{s.v}</div>
              </Reveal>
            ))}
          </div>
        </div>
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
          <SectionHead eyebrow="Selected work" title="Automations and agents we've built — and open-sourced." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
