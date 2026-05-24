import { Plate } from "./plate";
import { SectionLabel } from "./section-label";

type Desk = {
  numeral: string;
  kicker: string;
  title: string;
  italicWord: string;
  body: string;
  bullets: string[];
};

const desks: Desk[] = [
  {
    numeral: "I",
    kicker: "Calendar",
    title: "Bookings",
    italicWord: "land on your day.",
    body: "Client inquiries become appointments. Surveys land on your calendar with the vessel, the dock, and the drive time already filled in. Confirmations and reminders go out without you opening an email.",
    bullets: [
      "Two-way calendar sync",
      "Auto-confirmations and reminders",
      "Drive-time built into the slot",
    ],
  },
  {
    numeral: "II",
    kicker: "Inbox",
    title: "Client email,",
    italicWord: "threaded to the survey.",
    body: "Messages from a buyer or broker stay attached to the survey they belong to. No hunting through Gmail for the photo of the engine plate or last week's question about the rig.",
    bullets: [
      "Email threaded by survey",
      "Attachments saved into the file",
      "Reports delivered from inside the thread",
    ],
  },
  {
    numeral: "III",
    kicker: "Books",
    title: "Invoices out,",
    italicWord: "money in view.",
    body: "Invoices draft themselves the moment a survey is booked, send when the report goes out, and post to a finance dashboard you can actually read. The bookkeeping happens; you watch it happen.",
    bullets: [
      "Auto-drafted invoices",
      "Paid / outstanding at a glance",
      "Monthly P&L without a spreadsheet",
    ],
  },
];

export function Office() {
  return (
    <Plate id="office">
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-paper-edge/70 pb-6 md:mb-20">
        <div>
          <SectionLabel numeral="III" title="The Office" className="mb-3" />
          <h2 className="fv-display-soft font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-light leading-[0.98] tracking-[-0.02em] text-ink">
            A sole proprietor&rsquo;s back office,
            <br />
            <span className="fv-display-italic italic text-ink-soft">
              already in place.
            </span>
          </h2>
        </div>
        <span className="t-meta hidden shrink-0 tracking-[0.28em] md:block">
          pp. 18 — 21
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
        {desks.map((d, i) => (
          <article key={d.numeral} className="relative flex flex-col">
            <div className="mb-6 flex items-baseline justify-between">
              <div className="fv-display-numeral font-display text-[88px] leading-none text-brass-deep">
                {d.numeral}
              </div>
              <div className="t-meta tracking-[0.28em]">
                ★ {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="t-kicker mb-4 text-[11px]">{d.kicker}</div>

            <h3 className="fv-card-soft mb-5 font-display text-[28px] font-light leading-[1.1] tracking-[-0.01em] text-ink">
              {d.title}{" "}
              <span className="fv-card-italic italic text-brass-deep">
                {d.italicWord}
              </span>
            </h3>

            <p className="mb-6 font-serif text-[16px] leading-[1.6] text-ink-soft">
              {d.body}
            </p>

            <ul className="mt-auto space-y-2.5 border-t border-paper-edge/70 pt-5">
              {d.bullets.map((b) => (
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
