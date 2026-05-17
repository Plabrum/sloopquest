import Link from "next/link";
import { Wordmark } from "./marks";

const links = [
  { href: "/field-guide", label: "Field Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Almanac" },
];

export function Nav() {
  return (
    <header className="relative z-20 border-b border-paper-edge/70">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link href="/" className="group inline-flex items-center">
          <Wordmark className="transition-colors group-hover:text-brass-deep" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft link-grow hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft link-grow hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className="group relative inline-flex items-center gap-2 whitespace-nowrap border border-ink bg-ink px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-warm transition-all hover:bg-ocean-deep sm:px-4 sm:text-[11px]"
          >
            <span className="sm:hidden">Begin →</span>
            <span className="hidden sm:inline">Begin a survey</span>
            <span className="hidden transition-transform group-hover:translate-x-1 sm:inline">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
