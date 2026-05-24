import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

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
    kicker: "What you do",
    title: "Walk the dock,",
    italicWord: "look closely.",
    body: "Per-field photos. Findings attached to the section they belong to. Sticky section headers so you always know where you are. Built for gloves, salt spray, and a flashlight in one hand.",
    bullets: [
      "Per-field photo capture",
      "Inline findings (info · advisory · critical)",
      "Sticky section headers",
      "Works offline, syncs when you reconnect",
    ],
  },
  {
    numeral: "II",
    kicker: "How you record it",
    title: "Notes by hand,",
    italicWord: "dictation, or keyboard.",
    body: "Write the way you already do. Handwritten notes, dictation, and typed input all land in the same survey, the same section, the same field. Use whatever your hands are doing at the time.",
    bullets: [
      "Handwritten note capture",
      "Dictation, hands-free",
      "Keyboard entry",
      "All three land in the same place",
    ],
  },
  {
    numeral: "III",
    kicker: "Everything else",
    title: "Invoicing, scheduling,",
    italicWord: "drafting, delivery.",
    body: "The work around the survey is the work most surveyors get buried in. Invoices draft themselves. The schedule fills your calendar. The report assembles from your findings. The client gets it without you composing the email.",
    bullets: [
      "Invoices drafted automatically",
      "Calendar booked from client inquiries",
      "Reports assembled from your findings",
      "Delivered to the client on completion",
    ],
  },
];

export function Pillars() {
  return (
    <Plate tone="warm" id="approach">
      {/* Section header */}
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-paper-edge/70 pb-6 md:mb-20">
        <div>
          <SectionLabel numeral="II" title="Three Acts" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            You observe and document.
            <br />
            <span className="fv-display-italic italic text-ink-soft">
              The rest runs itself.
            </span>
          </h2>
        </div>
        <span className="t-meta hidden shrink-0 tracking-[0.28em] md:block">
          pp. 14 — 17
        </span>
      </div>

      {/* Pillars grid */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
        {pillars.map((p, i) => (
          <article key={p.numeral} className="relative flex flex-col">
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[88px] leading-none text-brass-deep">
                {p.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{p.kicker}</div>

            <h3 className="fv-card-soft mb-5 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {p.title}{" "}
              <span className="fv-card-italic italic text-brass-deep">
                {p.italicWord}
              </span>
            </h3>

            <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
              {p.body}
            </p>

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

    </Plate>
  );
}
