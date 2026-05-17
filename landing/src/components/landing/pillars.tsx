import { StarMark } from "./marks";

type Pillar = {
  numeral: string;
  kicker: string;
  title: string;
  italicWord: string;
  body: string;
  bullets: string[];
};

const pillars: Pillar[] = [
  {
    numeral: "I",
    kicker: "On the dock",
    title: "A capture surface for",
    italicWord: "the working surveyor.",
    body: "Photos go to the field they describe. Findings attach to the section they belong to. Auto-save fires on every blur. Built for tablets, gloves, salt spray, and a flashlight in one hand.",
    bullets: [
      "Per-field photo capture",
      "Inline findings (info · advisory · critical)",
      "Sticky section headers, snap-scroll",
      "Touch-first, offline-capable¹",
    ],
  },
  {
    numeral: "II",
    kicker: "Through the survey",
    title: "A document model that",
    italicWord: "respects the work.",
    body: "Sections, subsections, repeaters, conditional logic. Surveyors deviate from a template without forking it. When a useful addition repeats across N surveys, promote it back to the template — never silently lose a field.",
    bullets: [
      "Section / field / repeater hierarchy",
      "Conditional rendering at runtime",
      "Per-survey overrides, promotable",
      "Versioned templates",
    ],
  },
  {
    numeral: "III",
    kicker: "Off to the client",
    title: "A report that ships",
    italicWord: "the same day.",
    body: "Polished PDFs in your house style. Findings indexed by severity, photos placed beside their captions, recommendations triaged. Same-day turnaround stops being aspirational and starts being the default.",
    bullets: [
      "Branded PDF, HTML, JSON output",
      "Severity-sorted finding index",
      "Photo-to-caption auto-placement",
      "Client portal handoff",
    ],
  },
];

export function Pillars() {
  return (
    <section className="border-t border-paper-edge/60 bg-paper-warm/40">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        {/* Section header */}
        <div className="mb-14 flex items-end justify-between gap-6 border-b border-paper-edge/70 pb-6 md:mb-20">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
              <StarMark size={9} />
              §&nbsp;II &middot; Three Acts
            </div>
            <h2 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
              The arc of a survey,
              <br />
              <span
                className="italic text-ink-soft"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
              >
                in three movements.
              </span>
            </h2>
          </div>
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted md:block">
            pp. 14 — 17
          </span>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
          {pillars.map((p, i) => (
            <article key={p.numeral} className="relative flex flex-col">
              {/* Roman numeral */}
              <div className="mb-6 flex items-baseline justify-between">
                <div
                  className="font-display text-[88px] leading-none text-brass-deep"
                  style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1' }}
                >
                  {p.numeral}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
                  ★ {String(i + 1).padStart(2, "0")}
                </div>
              </div>

              {/* Kicker */}
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.28em] text-brass-deep">
                {p.kicker}
              </div>

              {/* Title */}
              <h3
                className="mb-5 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
              >
                {p.title}{" "}
                <span
                  className="italic text-brass-deep"
                  style={{ fontVariationSettings: '"opsz" 60, "SOFT" 100, "WONK" 1' }}
                >
                  {p.italicWord}
                </span>
              </h3>

              {/* Body */}
              <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
                {p.body}
              </p>

              {/* Bullets */}
              <ul className="mt-auto space-y-2.5 border-t border-paper-edge/70 pt-5">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-baseline gap-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft"
                  >
                    <span aria-hidden className="text-brass">
                      ✦
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          ¹ Offline capture · forthcoming · Q3 MMXXVI
        </p>
      </div>
    </section>
  );
}
