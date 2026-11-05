"use client";

import { useEffect, useState } from "react";

/**
 * Types each phrase out, holds, deletes, and moves to the next — the signature
 * motion on wesucceed's hero, here in Solvant blue. SSR-safe (renders the first
 * phrase on the server) and freezes to a static first phrase under
 * prefers-reduced-motion.
 */
export function Typewriter({
  phrases,
  className = "",
  typeMs = 55,
  deleteMs = 28,
  holdMs = 1600,
}: {
  phrases: string[];
  className?: string;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}) {
  const [text, setText] = useState(phrases[0] ?? "");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!phrases.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setText(phrases[0]);
      return;
    }

    setAnimating(true);
    let phrase = 0;
    let pos = phrases[0].length; // start fully typed, then delete
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = phrases[phrase];
      if (!deleting) {
        pos += 1;
        setText(current.slice(0, pos));
        if (pos >= current.length) {
          deleting = true;
          timer = setTimeout(tick, holdMs);
          return;
        }
        timer = setTimeout(tick, typeMs);
      } else {
        pos -= 1;
        setText(current.slice(0, Math.max(pos, 0)));
        if (pos <= 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          timer = setTimeout(tick, typeMs * 2);
          return;
        }
        timer = setTimeout(tick, deleteMs);
      }
    };

    timer = setTimeout(tick, holdMs);
    return () => clearTimeout(timer);
  }, [phrases, typeMs, deleteMs, holdMs]);

  return (
    <span className={className}>
      {text}
      <span className={`tw-caret ${animating ? "" : "tw-caret-static"}`} aria-hidden="true" />
    </span>
  );
}
