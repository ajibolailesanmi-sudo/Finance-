import { Reveal } from "./Reveal";
import { SectionHead } from "./ui";

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  industry?: string;
};

function initials(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Client quotes in cards. Renders nothing while `items` is empty, so the
 * section only appears once there are real testimonials to show.
 */
export function Testimonials({
  items,
  eyebrow = "In their words",
  title = "What clients say.",
}: {
  items: Testimonial[];
  eyebrow?: string;
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <section aria-label="Testimonials" className="border-t border-trace py-[clamp(52px,7vw,96px)]">
      <div className="mx-auto max-w-wrap px-6">
        <SectionHead eyebrow={eyebrow} title={title} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map((t) => (
            <Reveal key={`${t.name}-${t.company}`} className="flex flex-col rounded-[12px] border border-trace bg-surface p-7">
              <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[rgba(203,69,15,0.1)] font-display text-[14px] font-bold text-signal">
                {initials(t.company)}
              </span>
              <p className="font-display text-[19px] leading-[1.35] text-ink">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-graphite">
                <div className="text-ink">
                  {t.name}, {t.role}
                </div>
                <div>{t.company}</div>
                {t.industry ? <div>{t.industry}</div> : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
