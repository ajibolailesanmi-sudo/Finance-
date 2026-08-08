"use client";

import { useEffect, useState } from "react";
import { FLOWS } from "@/lib/content";

/**
 * Signature hero element (brief §6): a live node-and-line schematic where a
 * pulse travels Lead in → Agent → CRM → Reply sent and nodes light in sequence.
 * The labels rotate through several workflows so it reads as ANY workflow, not
 * just leads. SVG + CSS only. Freezes to a static diagram under
 * prefers-reduced-motion (handled in globals.css).
 */
export function Schematic() {
  const [i, setI] = useState(0);
  const f = FLOWS[i];

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % FLOWS.length), 6600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="sch w-full"
      role="img"
      aria-label="A live schematic of an automation running a business workflow: an input arrives, an agent processes it, your systems update, and an action completes."
    >
      <svg viewBox="0 0 820 210" preserveAspectRatio="xMidYMid meet" className="block h-auto w-full overflow-visible">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="#DDE3E0" />
          </marker>
        </defs>
        {[
          [120, 252],
          [348, 472],
          [568, 708],
        ].map(([x1, x2], k) => (
          <line key={k} className="spine" x1={x1} y1={132} x2={x2} y2={132} stroke="#DDE3E0" strokeWidth={2} markerEnd="url(#ah)" />
        ))}
        <text className="sch-arrowlab" x={186} y={122} textAnchor="middle" fontSize={11} fill="#4A5560" style={arrow}>
          {f.a[0]}
        </text>
        <text className="sch-arrowlab" x={410} y={122} textAnchor="middle" fontSize={11} fill="#4A5560" style={arrow}>
          {f.a[1]}
        </text>
        <text className="sch-arrowlab" x={638} y={122} textAnchor="middle" fontSize={11} fill="#4A5560" style={arrow}>
          {f.a[2]}
        </text>

        <circle className="pulse-glow" r={15} cx={0} cy={0} fill="#1F6FEB" />
        <circle className="pulse" r={5} cx={0} cy={0} fill="#1F6FEB" />

        <Node id="n1" x={66} idx="01" label={f.n[0]} below />
        <Node id="n2" x={300} idx="02" label={f.n[1]} boxed />
        <Node id="n3" x={520} idx="03" label={f.n[2]} boxed />
        <Node id="n4" x={754} idx="04" label={f.n[3]} below />
      </svg>
      <p className="sch-cap mt-3 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-graphite">{f.c}</p>
    </div>
  );
}

const arrow: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

function Node({
  id,
  x,
  idx,
  label,
  boxed = false,
  below = false,
}: {
  id: string;
  x: number;
  idx: string;
  label: string;
  boxed?: boolean;
  below?: boolean;
}) {
  return (
    <g className="node" id={id}>
      <text className="sch-idx" x={x} y={boxed ? 86 : 86} textAnchor="middle" fontSize={12} fill="#4A5560" style={{ fontFamily: "var(--font-mono), monospace", letterSpacing: "0.14em" }}>
        {idx}
      </text>
      {boxed ? <rect x={x - 45} y={112} width={90} height={40} rx={6} fill="#FFFFFF" stroke="#DDE3E0" strokeWidth={1.5} /> : null}
      <circle className="ring" cx={x} cy={132} r={28} fill="none" stroke="#1F6FEB" strokeWidth={2} opacity={0} />
      <circle className="dot" cx={x} cy={132} r={7} fill="#1F6FEB" opacity={boxed ? 0 : 0.28} />
      <text
        className="lbl"
        x={x}
        y={below ? 176 : 137}
        textAnchor="middle"
        fontSize={15}
        fontWeight={600}
        fill="#101820"
        style={{ fontFamily: "var(--font-body), sans-serif" }}
      >
        {label}
      </text>
    </g>
  );
}
