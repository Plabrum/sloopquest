import { appUrl } from "@/lib/app-url";
import { CompassRose } from "./marks";
import { Plate } from "./plate";
import { PrimaryButton } from "./primary-button";
import { SectionLabel } from "./section-label";

export function Cta() {
  return (
    <Plate size="lg" className="overflow-hidden">
      <div className="relative grid grid-cols-12 items-center gap-x-10">
        <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 md:block">
          <CompassRose size={420} className="opacity-20 drift" />
        </div>

        <div className="relative col-span-12 lg:col-span-9">
          <SectionLabel numeral="VII" title="The Invitation" className="mb-6" />

          <h2 className="fv-display-soft font-display text-[clamp(3rem,8vw,7.4rem)] font-light leading-[0.92] tracking-[-0.025em] text-ink">
            Begin a{" "}
            <span className="fv-display-italic italic text-brass-deep">
              survey.
            </span>
          </h2>

          <p className="mt-7 max-w-xl font-serif text-[19px] leading-[1.5] text-ink-soft md:text-[21px]">
            Open the workspace, click{" "}
            <em className="italic text-ink">New survey</em>, and capture your
            first vessel in under a minute. The first one is free. No card,
            no demo call, no &ldquo;book a time.&rdquo;
          </p>

          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <PrimaryButton href={appUrl("/auth")}>Open Sloopquest</PrimaryButton>
          </div>

          {/* Tiny details strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-moss" />
              No card required
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-moss" />
              Works offline
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
    </Plate>
  );
}
