import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { POSTS, formatDate } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Insights | Solvant Labs",
  description:
    "Practical notes on automation and AI agents for small businesses — what to automate first, why fast replies win, and what separates a demo from a dependable system.",
};

export default function InsightsPage() {
  return (
    <>
      <PageHero
        kicker="Insights"
        title="Notes on automation that actually ships."
        rotating={["What to automate first.", "Why speed wins.", "Demo vs. dependable."]}
        lede="Short, practical pieces on AI agents and automation for small service businesses — no hype, no jargon, nothing you need a glossary for."
      />

      <section className="py-[clamp(52px,7vw,96px)]" aria-label="Posts">
        <div className="mx-auto max-w-wrap px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p) => (
              <Link
                key={p.slug}
                href={`/insights/${p.slug}`}
                className="group flex flex-col rounded-[10px] border border-trace bg-surface p-7 transition hover:-translate-y-0.5 hover:border-signal hover:shadow-[0_12px_34px_rgba(16,24,32,0.07)]"
              >
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
                  {formatDate(p.date)} · {p.readMins} min read
                </div>
                <h2 className="mb-2 text-[21px] leading-[1.2] transition group-hover:text-signal">{p.title}</h2>
                <p className="text-[14.5px] leading-[1.55] text-graphite">{p.dek}</p>
                <span className="mt-5 font-mono text-[13px] text-signal after:content-['_→']">Read</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
