import { StarMark } from "./marks";

type Spec = { k: string; v: string; sub?: string };

const specs: Spec[] = [
  {
    k: "Field types",
    v: "14",
    sub: "text · segmented · select · photo grid · number grid · notes · signature · repeater · …",
  },
  { k: "Sections", v: "Unlimited", sub: "per template, nesting supported" },
  { k: "Conditional logic", v: "Yes", sub: "evaluated at runtime, surfaced as skipped placeholders" },
  { k: "Auto-save", v: "On blur", sub: "every field, no “save section” button" },
  {
    k: "Photo capture",
    v: "Camera · Library · Drag",
    sub: "auto-assigned by context, drag from “unassigned”",
  },
  { k: "Report formats", v: "PDF · HTML · JSON", sub: "branded, sortable, machine-readable" },
  { k: "Touch-optimized", v: "iPad first", sub: "desktop second — surveyors work standing" },
  { k: "Offline capture", v: "Q3 MMXXVI", sub: "forthcoming — sync on next dock-side wifi" },
  { k: "Storage", v: "AES-256, AWS us-east-1", sub: "encrypted at rest, audited quarterly" },
  { k: "Templates", v: "Versioned", sub: "promote per-survey adds with one click" },
  { k: "AI surveyor", v: "GPT-class, scoped", sub: "answers grounded in the current survey’s notes" },
  { k: "Compliance", v: "NAMS-aligned", sub: "SOC 2 in progress, GDPR-ready" },
];

export function Specifications() {
  return (
    <section className="border-t border-paper-edge/60 bg-ink text-paper-warm">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-6 border-b border-paper-warm/15 pb-8 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-light">
              <StarMark size={9} />
              §&nbsp;IV &middot; Specifications
            </div>
            <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-paper-warm">
              What&rsquo;s in the{" "}
              <span
                className="italic text-brass-light"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
              >
                instrument case.
              </span>
            </h2>
          </div>
          <p className="max-w-md font-serif text-[16px] italic leading-[1.5] text-paper-warm/70">
            A small reference card, the kind you&rsquo;d clip behind the back
            cover of a field guide.
          </p>
        </div>

        {/* Spec sheet — classified-ad layout */}
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          {specs.map((s, i) => (
            <div
              key={s.k}
              className={`flex items-baseline gap-6 border-b border-paper-warm/15 py-5 ${
                i < 2 ? "border-t border-paper-warm/15" : ""
              }`}
            >
              <span className="w-7 shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-warm/40">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-paper-warm/85">
                    {s.k}
                  </span>
                  <span
                    className="text-right font-display text-[20px] font-light leading-tight text-paper-warm"
                    style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
                  >
                    {s.v}
                  </span>
                </div>
                {s.sub && (
                  <p className="mt-1.5 font-serif text-[13px] italic leading-[1.4] text-paper-warm/55">
                    {s.sub}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <figure className="mt-20 border-l-2 border-brass-light pl-6 md:mt-28 md:pl-8">
          <blockquote
            className="font-display text-[clamp(1.6rem,3.2vw,2.6rem)] font-light italic leading-[1.2] text-paper-warm"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
          >
            &ldquo;Survey on the dock. Publish before dinner. The kit fits in
            one bag and the workflow fits in one screen.&rdquo;
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-paper-warm/55">
            <span className="inline-block h-px w-8 bg-paper-warm/30" />
            M. Carrick &middot; Marine Surveyor &middot; AMS&reg; &middot; Bristol, R.I.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
