export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-[760px]">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-trace py-1.5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[18px] font-medium marker:hidden">
            {f.q}
            <span className="font-mono text-[22px] leading-none text-signal">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <p className="max-w-[66ch] pb-4 text-[15px] text-graphite">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
