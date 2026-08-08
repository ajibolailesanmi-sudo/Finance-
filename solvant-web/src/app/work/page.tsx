import type { Metadata } from "next";
import { CTAButton } from "@/components/CTA";
import { Eyebrow } from "@/components/ui";
import { CASES, APP } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work | Solvant Labs",
  description:
    "Client automation builds from Solvant Labs — the problem, what we built, the stack, and the outcome, with client names withheld.",
};

function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded border border-dashed border-[#e3b34d] bg-[#fff6e6] px-1.5 py-0.5 font-mono text-[12.5px] text-[#8a5a00]">
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-[14.5px] leading-[1.5]">
      <b className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-graphite">{label}</b>
      {children}
    </div>
  );
}

export default function WorkPage() {
  return (
    <>
      <section className="paper-grid py-[clamp(46px,6vw,80px)] pb-[clamp(30px,4vw,44px)]">
        <div className="mx-auto max-w-wrap px-6">
          <Eyebrow>Selected work</Eyebrow>
          <h1 className="my-4 max-w-[18ch] text-[clamp(30px,4.6vw,48px)] leading-[1.06]">
            Client builds we can walk you through, end to end.
          </h1>
          <p className="max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-graphite">
            These are real client engagements. We keep client names confidential — but we can show you exactly what we built, the stack, and the outcome.
          </p>
        </div>
      </section>

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
                  <Fill>{c.stack}</Fill>
                </Row>
                <Row label="Outcome">
                  <Fill>{c.outcome}</Fill>
                </Row>
              </div>
            ))}

            {/* Live web app */}
            <div className="flex flex-col gap-3.5 rounded-[10px] border border-signal bg-surface p-7 shadow-[0_0_0_1px_var(--signal)]">
              <span className="self-start rounded border border-signal px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
                {APP.tag}
              </span>
              <h3 className="text-[20px]">
                <Fill>{APP.name}</Fill>
              </h3>
              <Row label="Problem">
                <Fill>{APP.problem}</Fill>
              </Row>
              <Row label="Built">
                <Fill>{APP.built}</Fill>
              </Row>
              <Row label="Stack">
                <Fill>{APP.stack}</Fill>
              </Row>
              <Row label="Live at">
                <a
                  href={APP.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[13px] text-signal after:content-['_→'] hover:text-signal-ink"
                >
                  {APP.urlLabel}
                </a>
              </Row>
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
