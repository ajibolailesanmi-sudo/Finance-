import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CTAButton } from "@/components/CTA";
import { Typewriter } from "@/components/Typewriter";
import { SectionHead, SectionHeadArt, ArrowLink, Hr } from "@/components/ui";
import {
  HERO,
  TOOLS,
  TOOLS_LABEL,
  STATS,
  WHY,
  WHY_LEDE,
  AUDIENCES,
  AUDIENCES_LEDE,
  PROBLEMS,
  SERVICES,
  SERVICES_LEDE,
  STEPS,
  CASES,
  FINAL_CTA,
} from "@/lib/content";

// Simple line icons for the "Why Solvant" tiles (index-matched to WHY).
const WHY_ICONS = [
  // clock — answer in seconds
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5 V12 L15 14" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // sparkle — kill the busywork
  <>
    <path d="M12 3 L13.7 9.3 L20 11 L13.7 12.7 L12 19 L10.3 12.7 L4 11 L10.3 9.3 Z" strokeLinejoin="round" />
  </>,
  // shield-check — nothing slips
  <>
    <path d="M12 2.5 L20 6 V11 C20 16 16.6 19.5 12 21.5 C7.4 19.5 4 16 4 11 V6 Z" strokeLinejoin="round" />
    <path d="M8.5 11.8 L11 14.2 L15.6 9.3" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // key — you own it
  <>
    <circle cx="8" cy="8" r="4" />
    <path d="M11 11 L19 19 M16 16 L18.5 13.5 M14 14 L16 16" strokeLinecap="round" strokeLinejoin="round" />
  </>,
];

// Line icons for the "Who we build for" tiles (index-matched to AUDIENCES).
const AUD_ICONS = [
  // home & trade — house
  <>
    <path d="M4 11 L12 4.5 L20 11" />
    <path d="M6.5 9.8 V19.5 H17.5 V9.8" />
    <path d="M10 19.5 V14 H14 V19.5" />
  </>,
  // clinics & practices — heart-pulse
  <>
    <path d="M3 12 H7.5 L9.5 8 L12.5 16 L14.5 12 H21" />
  </>,
  // law & professional — briefcase
  <>
    <rect x="3.5" y="8" width="17" height="11.5" rx="1.5" />
    <path d="M9 8 V6.2 A1 1 0 0 1 10 5.2 H14 A1 1 0 0 1 15 6.2 V8" />
    <path d="M3.5 13 H20.5" />
  </>,
  // real estate — building
  <>
    <path d="M5 20 V6.5 L12.5 3.5 V20" />
    <path d="M12.5 9.2 L19 11.7 V20" />
    <path d="M3.5 20 H20.5" />
    <path d="M8 9 H9.8 M8 12 H9.8 M8 15 H9.8" />
  </>,
  // agencies & studios — megaphone
  <>
    <path d="M4 10 V14 H7 L15 18 V6 L7 10 Z" />
    <path d="M18 9.5 A3.2 3.2 0 0 1 18 14.5" />
  </>,
  // field & contracting — truck
  <>
    <path d="M3 8 H13.5 V16 H3 Z" />
    <path d="M13.5 10.5 H17.5 L20.5 13.5 V16 H13.5 Z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </>,
];

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
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-8 -z-10"
              style={{ background: "radial-gradient(55% 55% at 68% 32%, rgba(203,69,15,0.13), transparent 70%)" }}
            />
            <div className="relative overflow-hidden rounded-[18px] border border-trace bg-surface shadow-[0_20px_55px_rgba(16,24,32,0.09)]">
              <div className="flex items-center gap-2.5 border-b border-trace px-5 py-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-signal" />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite">Live workflow</span>
                <span className="ml-auto rounded-full border border-trace px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-graphite">
                  24/7
                </span>
              </div>
              <div className="relative aspect-[16/9] w-full bg-ink">
                <Image
                  src="/images/accents/hero-accent.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
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
      <section className="relative overflow-hidden bg-ink text-paper" aria-label="The problem">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
          viewBox="0 0 1200 420"
          preserveAspectRatio="xMidYMid slice"
        >
          <g fill="none" stroke="#cb450f" strokeWidth="1.5">
            <path d="M-40 110 L230 190 L470 120 L720 210 L980 130 L1240 200" />
          </g>
          <g fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4">
            <path d="M-40 320 L250 260 L500 330 L760 255 L1010 330 L1240 270" />
          </g>
          <g fill="#cb450f">
            <circle cx="230" cy="190" r="4.5" />
            <circle cx="720" cy="210" r="4.5" />
            <circle cx="980" cy="130" r="4.5" />
          </g>
          <g fill="#ffffff" opacity="0.5">
            <circle cx="470" cy="120" r="3.5" />
            <circle cx="500" cy="330" r="3.5" />
            <circle cx="1010" cy="330" r="3.5" />
          </g>
        </svg>
        <Reveal className="relative z-10 mx-auto max-w-wrap px-6 py-[clamp(52px,7vw,96px)]">
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

      {/* WHY SOLVANT */}
      <section aria-label="Why Solvant Labs" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHeadArt eyebrow="Why Solvant Labs" title="Automation that earns its keep." lede={WHY_LEDE} src="/images/sections/v2/automation-engine.png" side="right" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w, i) => (
              <Reveal key={w.t} className="rounded-[10px] border border-trace bg-surface p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[9px] bg-signal/10 text-signal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    {WHY_ICONS[i]}
                  </svg>
                </div>
                <h3 className="mb-1.5 text-[17px]">{w.t}</h3>
                <p className="text-[14px] leading-[1.5] text-graphite">{w.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* SERVICES PREVIEW */}
      <section id="services-preview" aria-label="Services" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHeadArt eyebrow="What we build" title="Three productized offers. Fixed prices, so you know what you're getting." lede={SERVICES_LEDE} src="/images/sections/v2/services-offers.png" side="left" />
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

      {/* WHO WE BUILD FOR */}
      <section aria-label="Who we build for" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHead eyebrow="Who we build for" title="Small service businesses, mostly." lede={AUDIENCES_LEDE} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.t} className="rounded-[10px] border border-trace bg-surface p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[9px] bg-signal/10 text-signal">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {AUD_ICONS[i]}
                  </svg>
                </div>
                <h3 className="text-[18px]">{a.t}</h3>
                <p className="mt-2 text-[14px] leading-[1.5] text-graphite">{a.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* PROCESS PREVIEW */}
      <section aria-label="How it works" className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <SectionHeadArt eyebrow="How it works" title="Three steps, and most of the work is on us." src="/images/sections/v2/process-map-build-run.png" side="right" />
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
          <SectionHeadArt eyebrow="Selected work" title="Automations and agents we've built — and open-sourced." src="/images/sections/v2/proof-open-source.png" side="left" />
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
      <section className="relative overflow-hidden bg-ink text-center text-paper" aria-label="Book a call">
        <Image
          src="/images/accents/cta-accent.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(16,24,32,0.62) 0%, rgba(16,24,32,0.42) 50%, rgba(16,24,32,0.74) 100%)" }}
        />
        <Reveal className="relative z-10 mx-auto max-w-wrap px-6 py-[clamp(52px,7vw,96px)]">
          <h2 className="mx-auto mb-3.5 max-w-[22ch] text-[clamp(24px,3.4vw,34px)] text-white">{FINAL_CTA.headline}</h2>
          <p className="mx-auto mb-7 max-w-[46ch] text-[17px] text-[#b6c0c9]">{FINAL_CTA.sub}</p>
          <CTAButton className="!px-6 !py-4 !text-[16px]" />
        </Reveal>
      </section>
    </>
  );
}
