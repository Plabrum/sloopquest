import Link from "next/link";
import { AnchorGlyph, Wordmark } from "./marks";
import { SectionLabel } from "./section-label";

// TODO: build out the Almanac (blog / quarterly field-notes). When we commit
// to publishing, re-add Field guide / Changelog / Essays entries under it.
const columns = [
  {
    title: "Almanac",
    links: [
      { href: "/almanac", label: "Field notes" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Company",
    links: [{ href: "/#pricing", label: "Pricing" }],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-paper-edge/60 bg-paper-warm/40">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10">
        {/* Newsletter signup */}
        <div className="grid grid-cols-12 gap-x-10 gap-y-10 border-b border-paper-edge/70 pb-14">
          <div className="col-span-12 md:col-span-7">
            <SectionLabel title="The Almanac · blog & newsletter" className="mb-4" />
            <h3 className="fv-display-soft font-display text-[clamp(2rem,4.4vw,3.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
              The{" "}
              <span className="fv-display-italic italic text-brass-deep">
                Almanac.
              </span>
            </h3>
            <p className="mt-4 max-w-md font-serif text-[16px] leading-[1.55] text-ink-soft">
              Field notes, new templates, the occasional essay.{" "}
              <Link href="/almanac" className="link-rule italic text-ink hover:text-brass-deep">
                Read on the web
              </Link>{" "}
              or drop your email to get posts when they go out.
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
                placeholder="you@sloopquest.com"
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
              No tracking. Unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-12 gap-x-10 gap-y-12 py-14">
          <div className="col-span-12 md:col-span-5">
            <Wordmark className="mb-6" />
            <p className="max-w-sm font-serif text-[15px] italic leading-[1.55] text-ink-soft">
              A workspace for marine surveyors who care about their craft.
              <br />
              Built in Newport, R.I.
            </p>
            <div className="mt-6 flex items-center gap-3 text-ink-soft">
              <AnchorGlyph size={26} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                41&deg;29′N &nbsp;—&nbsp; 71&deg;19′W
              </span>
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title} className="col-span-6 md:col-span-2">
              <div className="t-kicker mb-5">{c.title}</div>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="link-grow font-serif text-[15px] text-ink-soft hover:text-ink"
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
