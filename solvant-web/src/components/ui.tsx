import Link from "next/link";

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
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="reveal mb-11 max-w-[62ch]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3.5 text-[clamp(24px,3.4vw,36px)] leading-[1.1]">{title}</h2>
      {lede ? <p className="mt-3.5 text-[18px] text-graphite">{lede}</p> : null}
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
