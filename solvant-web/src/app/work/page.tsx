import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { PageHero } from "@/components/PageHero";
import { CASES, APP } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work | Solvant Labs",
  description:
    "Automation and AI-agent builds from Solvant Labs — the problem, what we built, the stack, and the evidence, with public code on GitHub.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-[14.5px] leading-[1.5]">
      <b className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-graphite">{label}</b>
      {children}
    </div>
  );
}

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[13px] text-signal after:content-['_↗'] hover:text-signal-ink"
    >
      {children}
    </a>
  );
}

export default function WorkPage() {
  return (
    <>
      <PageHero
        kicker="Built in-house. Open on GitHub."
        title="Builds we made in-house — open on GitHub."
        rotating={[
          "A RAG support chatbot.",
          "Lead routing that dedupes and scores.",
          "An email triage agent.",
        ]}
        lede="Automations and AI agents we built at Solvant Labs to prove out common small-business workflows. The code is public — click through and see exactly how each one works."
      />

      <section className="py-[clamp(52px,7vw,96px)]">
        <div className="mx-auto max-w-wrap px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {CASES.map((c) => (
              <div key={c.title} className="flex flex-col gap-3.5 rounded-[10px] border border-trace bg-surface p-7">
                <span className="self-start rounded border border-trace bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-graphite">
                  {c.tag}
                </span>
                <h3 className="text-[20px]">{c.title}</h3>
                <Row label="Problem">
                  <p className="text-graphite">{c.problem}</p>
                </Row>
                <Row label="Built">
                  <p className="text-graphite">{c.built}</p>
                </Row>
                <Row label="Stack">
                  <p className="text-graphite">{c.stack}</p>
                </Row>
                {c.evidence ? (
                  <Row label="Evidence">
                    <p className="text-graphite">{c.evidence}</p>
                  </Row>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-4 pt-1">
                  <Out href={c.repo}>View code</Out>
                  {c.demo ? <Out href={c.demo}>{c.demoLabel || "Live demo"}</Out> : null}
                </div>
              </div>
            ))}

            {/* Live web app */}
            <div className="flex flex-col gap-3.5 rounded-[10px] border border-signal bg-surface p-7 shadow-[0_0_0_1px_var(--signal)]">
              <span className="self-start rounded border border-signal px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
                {APP.tag}
              </span>
              <h3 className="text-[20px]">{APP.name}</h3>
              <Row label="Problem">
                <p className="text-graphite">{APP.problem}</p>
              </Row>
              <Row label="Built">
                <p className="text-graphite">{APP.built}</p>
              </Row>
              <Row label="Stack">
                <p className="text-graphite">{APP.stack}</p>
              </Row>
              <div className="mt-auto flex flex-wrap gap-4 pt-1">
                <Out href={APP.url}>{APP.urlLabel}</Out>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <CTAButton />
          </div>
        </div>
      </section>
    </>
  );
}
