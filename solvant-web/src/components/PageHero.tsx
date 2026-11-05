import type { ReactNode } from "react";
import { Typewriter } from "./Typewriter";
import { CTAButton } from "./CTA";

/**
 * Shared inner-page header in the homepage's wesucceed-modeled style:
 * a period-separated capability kicker, a big bold headline, an optional
 * blue typewriter sub-line, and a lede. Keeps every page consistent.
 */
export function PageHero({
  kicker,
  title,
  rotating,
  lede,
  cta = false,
}: {
  kicker: string;
  title: ReactNode;
  rotating?: string[];
  lede?: ReactNode;
  cta?: boolean;
}) {
  return (
    <section className="paper-grid py-[clamp(50px,7vw,92px)] pb-[clamp(32px,4vw,48px)]">
      <div className="mx-auto max-w-wrap px-6">
        <div className="mb-5 font-mono text-[12px] font-medium uppercase tracking-[0.2em] text-graphite">
          {kicker}
        </div>
        <h1 className="max-w-[20ch] text-[clamp(32px,5.4vw,56px)] font-bold leading-[1.03] tracking-[-0.025em]">
          {title}
        </h1>
        {rotating && rotating.length ? (
          <div className="mt-3.5 min-h-[2.4em] font-display text-[clamp(18px,2.7vw,27px)] font-bold leading-[1.15] text-signal sm:min-h-[1.4em]">
            <Typewriter phrases={rotating} />
          </div>
        ) : null}
        {lede ? (
          <p className="mt-5 max-w-[58ch] text-[clamp(16px,1.6vw,19px)] text-graphite">{lede}</p>
        ) : null}
        {cta ? (
          <div className="mt-7">
            <CTAButton />
          </div>
        ) : null}
      </div>
    </section>
  );
}
