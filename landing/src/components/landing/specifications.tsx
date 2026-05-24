import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

type Spec = { k: string; v: string; sub?: string };

const specs: Spec[] = [
  {
    k: "Field types",
    v: "14",
    sub: "text · multiple choice · photo grid · number grid · notes · signature · repeating group · …",
  },
  { k: "Sections", v: "Unlimited", sub: "per template, nesting supported" },
  { k: "Smart sections", v: "Yes", sub: "questions appear and disappear based on prior answers" },
  { k: "Saving", v: "Automatic", sub: "every field, every time. No save button to remember." },
  {
    k: "Photo capture",
    v: "Camera · Library · Drag",
    sub: "auto-assigned by context, drag from “unassigned”",
  },
  { k: "Report formats", v: "PDF · Web link", sub: "branded, share-able, indexed by finding" },
  { k: "Offline capture", v: "Yes", sub: "syncs the moment you're back on wifi" },
  { k: "Storage", v: "Encrypted, US-hosted", sub: "your data, locked at rest and in transit" },
  { k: "Templates", v: "Versioned", sub: "one-click to promote per-survey additions" },
  { k: "Dictation", v: "Hands-free", sub: "speak into a field, it lands as text in the right place" },
  { k: "Scheduling", v: "Calendar sync", sub: "client inquiries become bookings, with reminders" },
  { k: "Inbox", v: "Threaded by survey", sub: "client email and attachments live with the file" },
  { k: "Invoicing", v: "Auto-drafted", sub: "drafted on booking, sent on delivery, tracked to paid" },
  { k: "Finance", v: "Built-in dashboard", sub: "paid · outstanding · monthly P&L, no spreadsheet" },
  { k: "Compliance", v: "NAMS-aligned", sub: "built to SOC 2 and GDPR practices" },
];

export function Specifications() {
  return (
    <Plate tone="ink" id="specs">
      {/* Header */}
      <div className="mb-14 flex flex-col gap-6 border-b border-paper-warm/15 pb-8 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div>
          <SectionLabel numeral="V" title="Specifications" tone="light" className="mb-3" />
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-paper-warm">
            What&rsquo;s in the{" "}
            <span className="fv-display-italic italic text-brass-light">
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
                <span className="fv-card-soft text-right font-display text-[20px] font-light leading-tight text-paper-warm">
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

    </Plate>
  );
}
