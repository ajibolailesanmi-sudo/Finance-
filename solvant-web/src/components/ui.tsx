import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal";

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.16em] text-graphite before:h-px before:w-6 before:bg-signal before:content-[''] ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  /** Override the wrapper classes (default adds the section's bottom margin). */
  className?: string;
}) {
  return (
    <Reveal className={className ?? "mb-11 max-w-[62ch]"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3.5 text-[clamp(24px,3.4vw,36px)] leading-[1.1]">{title}</h2>
      {lede ? <p className="mt-3.5 text-[18px] text-graphite">{lede}</p> : null}
    </Reveal>
  );
}

/**
 * Section header paired with an illustration: text on one side, image on the
 * other. `side` puts the image left or right on desktop (stacks on mobile).
 */
export function SectionHeadArt({
  eyebrow,
  title,
  lede,
  src,
  side = "right",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  src: string;
  side?: "left" | "right";
}) {
  return (
    <div className="mb-11 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_0.85fr] md:gap-12">
      <SectionHead eyebrow={eyebrow} title={title} lede={lede} className="max-w-[62ch]" />
      <Reveal
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-[14px] border border-trace bg-surface shadow-[0_18px_50px_rgba(16,24,32,0.08)] ${
          side === "left" ? "md:order-first" : ""
        }`}
      >
        <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" />
      </Reveal>
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-mono text-[13px] tracking-[0.04em] text-signal after:content-['_→'] hover:text-signal-ink"
    >
      {children}
    </Link>
  );
}

export function Hr() {
  return <hr className="m-0 h-px border-0 bg-trace" />;
}
