import Link from "next/link";
import { CONTACT, CTA_LABEL, BOOKING_URL, BOOKING_CONFIGURED } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-trace bg-paper py-12">
      <div className="mx-auto max-w-wrap px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-display text-[18px] font-bold text-ink">Solvant Labs</div>
            <p className="mt-2.5 max-w-[34ch] text-[14px] text-graphite">
              AI agents and automations for US small businesses. Built with engineering rigor, priced up front.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-graphite">Site</h4>
            {[
              ["/services", "Services"],
              ["/work", "Work"],
              ["/process", "Process"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="block py-1.5 text-[14px] text-graphite hover:text-signal">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <h4 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-graphite">Contact</h4>
            {BOOKING_CONFIGURED ? (
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1.5 text-[14px] text-graphite hover:text-signal"
              >
                Book an intro call
              </a>
            ) : (
              <Link href="/contact" className="block py-1.5 text-[14px] text-graphite hover:text-signal">
                Book an intro call
              </Link>
            )}
            <span className="block py-1.5 text-[14px] text-graphite">{CONTACT.email}</span>
            <span className="block py-1.5 text-[14px] text-graphite">Solvant Labs · {CONTACT.address}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-4 border-t border-trace pt-5 text-[13px] text-graphite">
          <div>© {new Date().getFullYear()} Solvant Labs</div>
          <Link href="/privacy" className="hover:text-signal">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
