"use client";

import { useEffect, useState } from "react";

/**
 * A thin vertical rail in the left gutter that fills as you scroll, with a
 * dot per page section (click to jump). Desktop-only (xl+), where the gutter
 * beside the 1120px content column has room for it.
 */
export function ScrollSpine() {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState<{ label: string; ratio: number; index: number }[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = () => Array.from(document.querySelectorAll<HTMLElement>("main section[aria-label]"));
    let tops: number[] = [];
    let max = 1;

    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const list = sections().map((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        return { label: el.getAttribute("aria-label") || "", top };
      });
      tops = list.map((l) => l.top);
      // Drop a marker that would sit on top of the previous one (very short sections).
      const marks: { label: string; ratio: number; index: number }[] = [];
      list.forEach((l, i) => {
        const ratio = Math.min(1, Math.max(0, l.top / max));
        const prev = marks[marks.length - 1];
        if (!prev || ratio - prev.ratio >= 0.018) marks.push({ label: l.label, ratio, index: i });
      });
      setDots(marks);
    };

    const onScroll = () => {
      const y = window.scrollY;
      setProgress(Math.min(1, Math.max(0, y / max)));
      let a = 0;
      const line = y + window.innerHeight * 0.45;
      tops.forEach((t, i) => {
        if (t <= line) a = i;
      });
      setActive(a);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    onResize();
    const settle = setTimeout(onResize, 900); // re-measure once fonts/images settle
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (dots.length < 2) return null;

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none fixed bottom-[88px] top-[88px] z-30 hidden xl:block"
      style={{ left: "max(14px, calc((100vw - 1120px) / 2 - 44px))" }}
    >
      <div className="relative h-full w-px bg-trace">
        <div className="absolute left-0 top-0 w-px bg-signal transition-[height] duration-150" style={{ height: `${progress * 100}%` }} />
        {dots.map((d, i) => (
          <button
            key={`${d.label}-${i}`}
            type="button"
            title={d.label}
            aria-label={`Go to ${d.label}`}
            onClick={() => {
              const els = document.querySelectorAll<HTMLElement>("main section[aria-label]");
              els[d.index]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`pointer-events-auto absolute -left-[5px] h-[11px] w-[11px] rounded-full border transition ${
              d.index === active ? "scale-125 border-signal bg-signal" : "border-trace bg-paper hover:border-signal"
            }`}
            style={{ top: `calc(${d.ratio * 100}% - 5px)` }}
          />
        ))}
      </div>
    </nav>
  );
}
