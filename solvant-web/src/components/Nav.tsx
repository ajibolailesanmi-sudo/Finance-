"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CTAButton } from "./CTA";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/process", label: "Process" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-trace bg-paper/90 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-wrap items-center justify-between gap-5 px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[18px] font-bold text-ink">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="1.5" y="1.5" width="19" height="19" rx="4" fill="none" stroke="#1F6FEB" strokeWidth="1.6" />
            <circle cx="7" cy="7" r="2" fill="#1F6FEB" />
            <circle cx="15" cy="15" r="2" fill="#101820" />
            <path d="M8.4 8.4 L13.6 13.6" stroke="#4A5560" strokeWidth="1.4" />
          </svg>
          Solvant Labs
        </Link>

        <nav
          aria-label="Primary"
          className={`${
            open ? "flex" : "hidden"
          } absolute left-0 right-0 top-16 flex-col items-start gap-0 border-b border-trace bg-paper px-6 py-2 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0`}
        >
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`w-full border-b border-trace py-3 text-[15px] font-medium md:w-auto md:border-0 md:py-0 ${
                  active ? "text-ink" : "text-graphite hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <CTAButton className="!px-4 !py-2.5 !text-[14px] max-[440px]:hidden" />
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-[7px] border border-trace p-2 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="#101820" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
