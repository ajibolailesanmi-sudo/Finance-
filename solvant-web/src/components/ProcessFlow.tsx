"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Before/after process diagram: a messy "today" path that wanders through
 * inboxes, spreadsheets and phones, then the clean "with an agent" line with a
 * human-approval branch. Draws itself in on scroll. Pure SVG, original icons.
 */

export type IconName =
  | "inbox" | "sheet" | "phone" | "clock" | "alert" | "repeat" | "bolt"
  | "check" | "calendar" | "db" | "bell" | "user" | "mail" | "doc";

export type FlowStep = { label: string; icon: IconName };

export type FlowStage = {
  kicker: string;
  title: string;
  blurb: string;
  steps: FlowStep[];
  /** Optional human-in-the-loop node hanging below the line, between step[afterIndex] and the next. */
  branch?: { afterIndex: number; label: string; icon: IconName };
};

const ICONS: Record<IconName, JSX.Element> = {
  inbox: (<><path d="M3 13 L5 5 H19 L21 13 V19 H3 Z" /><path d="M3 13 H8 L10 16 H14 L16 13 H21" /></>),
  sheet: (<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10 H20 M4 15 H20 M10 4 V20" /></>),
  phone: (<path d="M5 4 H9 L11 9 L8.5 10.5 C9.5 13 11 14.5 13.5 15.5 L15 13 L20 15 V19 C20 20 19 21 18 21 C10 21 3 14 3 6 C3 5 4 4 5 4 Z" />),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5 V12 L15 14" /></>),
  alert: (<><path d="M12 4 L21 19.5 H3 Z" /><path d="M12 10 V14 M12 16.5 V17" /></>),
  repeat: (<><path d="M4 10 A8 8 0 0 1 18.5 7 M20 14 A8 8 0 0 1 5.5 17" /><path d="M18.5 3.5 V7 H15 M5.5 20.5 V17 H9" /></>),
  bolt: (<path d="M13 3 L5 13.5 H12 L11 21 L19 10.5 H12 Z" />),
  check: (<><circle cx="12" cy="12" r="8.5" /><path d="M8 12.5 L10.8 15.2 L16 9.8" /></>),
  calendar: (<><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10 H20 M8 3.5 V7 M16 3.5 V7" /></>),
  db: (<><ellipse cx="12" cy="6.5" rx="7.5" ry="3" /><path d="M4.5 6.5 V17.5 C4.5 19.2 7.9 20.5 12 20.5 C16.1 20.5 19.5 19.2 19.5 17.5 V6.5 M4.5 12 C4.5 13.7 7.9 15 12 15 C16.1 15 19.5 13.7 19.5 12" /></>),
  bell: (<><path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z" /><path d="M10 20.5 A2 2 0 0 0 14 20.5" /></>),
  user: (<><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20 C5 16.5 8 14.5 12 14.5 C16 14.5 19 16.5 19 20" /></>),
  mail: (<><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M3.5 8 L12 13.5 L20.5 8" /></>),
  doc: (<><path d="M7 3.5 H14 L19 8.5 V20.5 H7 Z" /><path d="M14 3.5 V8.5 H19 M9.5 12.5 H16.5 M9.5 16 H16.5" /></>),
};

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const W = 1000;
const FONT = "var(--font-body), system-ui, sans-serif";

function Node({ x, y, icon, tone, delay, show }: { x: number; y: number; icon: IconName; tone: "muted" | "accent"; delay: number; show: boolean }) {
  const accent = tone === "accent";
  return (
    <g style={{ opacity: show ? 1 : 0, transition: `opacity .5s ease ${delay}ms` }}>
      <circle cx={x} cy={y} r={22} fill="var(--surface)" stroke={accent ? "var(--signal)" : "var(--trace)"} strokeWidth={accent ? 2 : 1.5} />
      <g
        transform={`translate(${x - 12} ${y - 12})`}
        fill="none"
        stroke={accent ? "var(--signal)" : "var(--graphite)"}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[icon]}
      </g>
    </g>
  );
}

const VW = 360; // vertical (mobile) viewBox width
const VSTEP = 86;

function BeforeDiagram({ steps, show, vertical }: { steps: FlowStep[]; show: boolean; vertical?: boolean }) {
  const n = steps.length;
  const xs = vertical ? steps.map((_, i) => (i % 2 === 0 ? 70 : 150)) : steps.map((_, i) => 70 + (i * (W - 140)) / Math.max(1, n - 1));
  const ys = vertical ? steps.map((_, i) => 44 + i * VSTEP) : steps.map((_, i) => (i % 2 === 0 ? 96 : 176));
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    if (vertical) {
      const dy = ys[i] - ys[i - 1];
      d += ` C ${xs[i - 1]} ${ys[i - 1] + dy * 0.5}, ${xs[i]} ${ys[i] - dy * 0.5}, ${xs[i]} ${ys[i]}`;
    } else {
      const dx = xs[i] - xs[i - 1];
      d += ` C ${xs[i - 1] + dx * 0.5} ${ys[i - 1]}, ${xs[i] - dx * 0.5} ${ys[i]}, ${xs[i]} ${ys[i]}`;
    }
  }
  const vb = vertical ? `0 0 ${VW} ${44 + (n - 1) * VSTEP + 44}` : `0 0 ${W} 272`;
  return (
    <svg viewBox={vb} className="block h-auto w-full overflow-visible" role="img" aria-label="Today: a lead wanders between an inbox, a spreadsheet and a phone, and goes cold.">
      <path
        d={d}
        fill="none"
        stroke="var(--graphite)"
        strokeWidth={1.5}
        opacity={0.55}
        strokeDasharray={2400}
        strokeDashoffset={show ? 0 : 2400}
        style={{ transition: "stroke-dashoffset 1.6s ease" }}
      />
      {steps.map((s, i) => (
        <g key={i}>
          <Node x={xs[i]} y={ys[i]} icon={s.icon} tone="muted" delay={200 + i * 110} show={show} />
          <text
            x={vertical ? 206 : xs[i]}
            y={vertical ? ys[i] + 5 : ys[i] < 130 ? 52 : 232}
            textAnchor={vertical ? "start" : "middle"}
            fontSize={13}
            fill="var(--graphite)"
            style={{ fontFamily: FONT, opacity: show ? 1 : 0, transition: `opacity .5s ease ${260 + i * 110}ms` }}
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AfterDiagram({ steps, branch, show, vertical }: { steps: FlowStep[]; branch?: FlowStage["branch"]; show: boolean; vertical?: boolean }) {
  const n = steps.length;
  // Horizontal: evenly spaced on one line. Vertical: stacked, with extra room
  // after the branching step so the approval node and its label fit.
  const xs = vertical ? steps.map(() => 70) : steps.map((_, i) => 70 + (i * (W - 140)) / Math.max(1, n - 1));
  const ys: number[] = [];
  if (vertical) {
    let y = 44;
    steps.forEach((_, i) => {
      ys.push(y);
      y += branch && i === branch.afterIndex ? VSTEP + 100 : VSTEP;
    });
  } else {
    steps.forEach(() => ys.push(120));
  }
  const a0 = branch ? branch.afterIndex : 0;
  const bx = branch ? (vertical ? 240 : (xs[a0] + xs[a0 + 1]) / 2) : 0;
  const by = branch ? (vertical ? (ys[a0] + ys[a0 + 1]) / 2 : 212) : 0;
  const vb = vertical ? `0 0 ${VW} ${ys[n - 1] + 44}` : `0 0 ${W} ${branch ? 266 : 190}`;
  const branchPath = branch
    ? vertical
      ? `M ${xs[a0]} ${ys[a0] + 40} H ${bx} V ${by - 22} M ${bx} ${by + 22} V ${ys[a0 + 1] - 40} H ${xs[a0 + 1]}`
      : `M ${xs[a0]} ${ys[a0] + 22} V ${by} H ${bx - 22} M ${bx + 22} ${by} H ${xs[a0 + 1]} V ${ys[a0 + 1] + 22}`
    : "";
  return (
    <svg viewBox={vb} className="block h-auto w-full overflow-visible" role="img" aria-label="With an agent: the lead is answered, qualified, booked and logged in one straight line, with you approving quotes.">
      <path
        d={`M ${xs[0]} ${ys[0]} L ${xs[n - 1]} ${ys[n - 1]}`}
        fill="none"
        stroke="var(--signal)"
        strokeWidth={2.5}
        strokeDasharray={1200}
        strokeDashoffset={show ? 0 : 1200}
        style={{ transition: "stroke-dashoffset 1.4s ease .2s" }}
      />
      {branch ? (
        <path
          d={branchPath}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={1.5}
          strokeDasharray="4 5"
          style={{ opacity: show ? 0.7 : 0, transition: "opacity .6s ease 1.2s" }}
        />
      ) : null}
      {steps.map((s, i) => (
        <g key={i}>
          <Node x={xs[i]} y={ys[i]} icon={s.icon} tone="accent" delay={300 + i * 120} show={show} />
          <text
            x={vertical ? 112 : xs[i]}
            y={vertical ? ys[i] + 5 : 70}
            textAnchor={vertical ? "start" : "middle"}
            fontSize={13}
            fill="var(--ink)"
            style={{ fontFamily: FONT, opacity: show ? 1 : 0, transition: `opacity .5s ease ${360 + i * 120}ms` }}
          >
            {s.label}
          </text>
        </g>
      ))}
      {branch ? (
        <g>
          <Node x={bx} y={by} icon={branch.icon} tone="muted" delay={1300} show={show} />
          <text
            x={bx}
            y={by + 42}
            textAnchor="middle"
            fontSize={13}
            fill="var(--graphite)"
            style={{ fontFamily: FONT, opacity: show ? 1 : 0, transition: "opacity .5s ease 1400ms" }}
          >
            {branch.label}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function StageCard({ stage, tone, children }: { stage: FlowStage; tone: "muted" | "accent"; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-trace bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(var(--paper-line) 1px, transparent 1px), linear-gradient(90deg, var(--paper-line) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative px-6 pb-1 pt-6 md:px-8 md:pt-7">
        <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === "accent" ? "text-signal" : "text-graphite"}`}>
          {stage.kicker}
        </div>
        <h3 className="mt-2 text-[clamp(19px,2.3vw,24px)]">{stage.title}</h3>
        <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-graphite">{stage.blurb}</p>
      </div>
      <div className="relative px-3 pb-4 md:px-6">{children}</div>
    </div>
  );
}

export function ProcessFlow({ before, after }: { before: FlowStage; after: FlowStage }) {
  const b = useInView<HTMLDivElement>();
  const a = useInView<HTMLDivElement>();
  return (
    <div className="flex flex-col gap-5">
      <div ref={b.ref}>
        <StageCard stage={before} tone="muted">
          <div className="hidden md:block">
            <BeforeDiagram steps={before.steps} show={b.inView} />
          </div>
          <div className="mx-auto max-w-[360px] md:hidden">
            <BeforeDiagram steps={before.steps} show={b.inView} vertical />
          </div>
        </StageCard>
      </div>
      <div ref={a.ref}>
        <StageCard stage={after} tone="accent">
          <div className="hidden md:block">
            <AfterDiagram steps={after.steps} branch={after.branch} show={a.inView} />
          </div>
          <div className="mx-auto max-w-[360px] md:hidden">
            <AfterDiagram steps={after.steps} branch={after.branch} show={a.inView} vertical />
          </div>
        </StageCard>
      </div>
    </div>
  );
}
