import Link from "next/link";
import { CompassRose, StarMark } from "./marks";

export function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-paper-edge/60">
      <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-36">
        <div className="relative grid grid-cols-12 items-center gap-x-10">
          {/* Decorative compass */}
          <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 md:block">
            <CompassRose size={420} className="opacity-20 drift" />
          </div>

          <div className="relative col-span-12 lg:col-span-9">
            <div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
              <StarMark size={9} />
              §&nbsp;V &middot; The Invitation
            </div>

            <h2
              className="font-display text-[clamp(3rem,8vw,7.4rem)] font-light leading-[0.92] tracking-[-0.025em] text-ink"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
            >
              Begin a{" "}
              <span
                className="italic text-brass-deep"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
              >
                survey.
              </span>
            </h2>

            <p className="mt-7 max-w-xl font-serif text-[19px] leading-[1.5] text-ink-soft md:text-[21px]">
              Open the workspace, click{" "}
              <em className="italic text-ink">New survey</em>, and capture your
              first vessel inside of a minute. The first one is free — no card,
              no demo call, no &ldquo;book a time.&rdquo;
            </p>

            <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Link
                href="/get-started"
                className="group relative inline-flex items-center gap-3 border border-ink bg-ink px-8 py-4 font-mono text-[12px] uppercase tracking-[0.22em] text-paper-warm transition-all hover:bg-ocean-deep"
              >
                <StarMark size={9} className="text-brass-light" />
                Open Sloopquest
                <span className="ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/sample-report.pdf"
                className="inline-flex items-center gap-2 font-serif text-[15px] italic text-ink-soft link-rule hover:text-brass-deep"
              >
                Or download a sample report
                <span aria-hidden>↘</span>
              </Link>
            </div>

            {/* Tiny details strip */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              <span className="flex items-center gap-2">
                <span className="inline-block h-1 w-1 rounded-full bg-moss" />
                No card required
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-1 w-1 rounded-full bg-moss" />
                iPad-ready
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-1 w-1 rounded-full bg-moss" />
                Export anywhere
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-1 w-1 rounded-full bg-moss" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
