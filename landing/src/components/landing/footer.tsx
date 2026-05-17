import Link from "next/link";
import { AnchorGlyph, StarMark, Wordmark } from "./marks";

const columns = [
  {
    title: "Workspace",
    links: [
      { href: "/workspace", label: "The document" },
      { href: "/templates", label: "Templates" },
      { href: "/findings", label: "Findings" },
      { href: "/reports", label: "Reports" },
      { href: "/ai", label: "AI surveyor" },
    ],
  },
  {
    title: "Almanac",
    links: [
      { href: "/field-guide", label: "Field guide" },
      { href: "/changelog", label: "Changelog" },
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Quartermaster",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/api", label: "API" },
      { href: "/status", label: "Status" },
      { href: "/security", label: "Security" },
      { href: "/terms", label: "Terms & privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-paper-edge/60 bg-paper-warm/40">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10">
        {/* Top: newsletter signup */}
        <div className="grid grid-cols-12 gap-x-10 gap-y-10 border-b border-paper-edge/70 pb-14">
          <div className="col-span-12 md:col-span-7">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
              <StarMark size={9} />
              Field Notes &middot; quarterly
            </div>
            <h3
              className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
            >
              Dispatches from{" "}
              <span
                className="italic text-brass-deep"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
              >
                the dock.
              </span>
            </h3>
            <p className="mt-4 max-w-md font-serif text-[16px] leading-[1.55] text-ink-soft">
              Four times a year. One letter, hand-set. New templates, product
              notes, an occasional essay. No tracking, no &ldquo;product
              updates.&rdquo;
            </p>
          </div>

          <div className="col-span-12 md:col-span-5">
            <form className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter" className="sr-only">
                Email
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="captain@harbor.co"
                className="flex-1 border border-ink/20 bg-paper-card px-4 py-3 font-serif text-[15px] text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 border border-ink bg-paper px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:bg-ink hover:text-paper-warm"
              >
                Subscribe
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </form>
            <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              <span className="inline-block h-1 w-1 rounded-full bg-moss pulse-dot" />
              ~1,200 surveyors aboard
            </p>
          </div>
        </div>

        {/* Middle: link columns */}
        <div className="grid grid-cols-12 gap-x-10 gap-y-12 py-14">
          {/* Brand block */}
          <div className="col-span-12 md:col-span-5">
            <Wordmark className="mb-6" />
            <p className="max-w-sm font-serif text-[15px] italic leading-[1.55] text-ink-soft">
              A workspace for marine surveyors who care about their craft.
              <br />
              Hand-bound in Newport, R.I.
            </p>
            <div className="mt-6 flex items-center gap-3 text-ink-soft">
              <AnchorGlyph size={26} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                41&deg;22′N &nbsp;—&nbsp; 70&deg;57′W
              </span>
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title} className="col-span-6 md:col-span-2">
              <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
                {c.title}
              </div>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-serif text-[15px] text-ink-soft link-grow hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-12 md:col-span-1" />
        </div>

        {/* Bottom strip */}
        <div className="flex flex-col items-start gap-4 border-t border-paper-edge/70 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            © MMXXVI Sloopquest, Inc. &middot; All soundings honest
          </div>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            <Link href="#" className="link-grow hover:text-ink">
              Twitter ↗
            </Link>
            <Link href="#" className="link-grow hover:text-ink">
              GitHub ↗
            </Link>
            <Link href="#" className="link-grow hover:text-ink">
              RSS
            </Link>
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss" />
              All systems clear
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
