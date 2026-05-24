import { appUrl } from "@/lib/app-url";
import { AnchorGlyph, StarMark } from "./marks";
import { Plate } from "./plate";
import { PrimaryButton } from "./primary-button";
import { SectionLabel } from "./section-label";

type Tier = {
  numeral: string;
  kicker: string;
  name: string;
  italicWord: string;
  price: string;
  unit: string;
  blurb: string;
  includes: string[];
  footnote: string;
};

const tiers: Tier[] = [
  {
    numeral: "I",
    kicker: "In commission",
    name: "Working",
    italicWord: "season.",
    price: "$50",
    unit: "flat · per month",
    blurb:
      "Active surveying: capture, draft, deliver. One flat fee, every vessel on your books, billed monthly.",
    includes: [
      "Unlimited vessels and surveys",
      "All field types and templates",
      "Branded PDF & client web link",
      "Offline capture, full-resolution media",
      "Hands-free dictation",
    ],
    footnote: "No per-seat, no per-survey. Bring the whole crew.",
  },
  {
    numeral: "II",
    kicker: "Hauled out",
    name: "Cold",
    italicWord: "storage.",
    price: "$5",
    unit: "flat · per month",
    blurb:
      "Off-season parking. Files stay encrypted and indexed, reports remain shareable, your archive simply sleeps until you launch back in.",
    includes: [
      "Full archive, read-only",
      "Live share links stay current",
      "One-click return to active",
      "No data migration on resume",
    ],
    footnote: "Switch in or out, any month.",
  },
];

export function Pricing() {
  return (
    <Plate tone="warm" id="pricing">
      {/* Header — posted tariff */}
      <div className="mb-14 grid grid-cols-12 items-end gap-6 border-b border-paper-edge/70 pb-7 md:mb-20">
        <div className="col-span-12 md:col-span-8">
          <SectionLabel numeral="VI" title="Posted Tariff" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            Two fees, plainly{" "}
            <span className="fv-display-italic italic text-ink-soft">
              posted.
            </span>
          </h2>
        </div>
        <div className="col-span-12 hidden flex-col items-end gap-1 md:col-span-4 md:flex">
          <span className="t-meta tracking-[0.28em]">No. 7 — Schedule of Fees</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            effective season 2026
          </span>
        </div>
      </div>

      {/* Fee schedule — two columns, like a posted ledger */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-12">
        {tiers.map((t, i) => (
          <article
            key={t.numeral}
            className={`relative col-span-12 flex flex-col border-paper-edge/70 md:col-span-6 ${
              i === 0
                ? "md:border-r md:pr-12"
                : "md:pl-2"
            }`}
          >
            {/* Top rail: numeral + ledger no. */}
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[88px] leading-none text-brass-deep">
                {t.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ ENTRY {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{t.kicker}</div>

            <h3 className="fv-card-soft mb-6 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {t.name}{" "}
              <span className="fv-card-italic italic text-brass-deep">
                {t.italicWord}
              </span>
            </h3>

            {/* Price block — large numeral, mono unit beneath */}
            <div className="mb-6 flex items-baseline gap-3 border-y border-paper-edge/70 py-5">
              <span className="fv-display-soft font-display text-[64px] font-light leading-none tracking-[-0.02em] text-ink">
                {t.price}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {t.unit}
              </span>
            </div>

            <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
              {t.blurb}
            </p>

            <ul className="mb-6 space-y-2.5">
              {t.includes.map((line) => (
                <li
                  key={line}
                  className="flex items-baseline gap-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft"
                >
                  <span aria-hidden className="text-brass">
                    ✦
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <p className="mt-auto border-t border-paper-edge/70 pt-4 font-serif text-[13px] italic leading-[1.45] text-ink-muted">
              {t.footnote}
            </p>
          </article>
        ))}
      </div>

      {/* Footer rail — invitation + small print */}
      <div className="mt-16 flex flex-col gap-8 border-t border-paper-edge/70 pt-8 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-start gap-4">
          <AnchorGlyph size={28} className="mt-1 shrink-0 text-brass-deep" />
          <div>
            <div className="font-display text-[20px] font-light leading-[1.2] tracking-[-0.01em] text-ink">
              First month is{" "}
              <span className="fv-card-italic italic text-brass-deep">
                on the house.
              </span>
            </div>
            <p className="mt-1 font-serif text-[14px] leading-[1.5] text-ink-soft">
              No card, no demo call. Bill begins in month two.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <PrimaryButton href={appUrl("/auth")}>Begin a survey</PrimaryButton>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            <StarMark size={8} className="text-brass" />
            <span>Invoiced monthly · cancel any time</span>
          </div>
        </div>
      </div>
    </Plate>
  );
}
