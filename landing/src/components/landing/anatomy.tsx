import { StarMark } from "./marks";

export function Anatomy() {
  return (
    <section className="border-t border-paper-edge/60">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        {/* Header */}
        <div className="mb-12 grid grid-cols-12 gap-x-6 border-b border-paper-edge/70 pb-8">
          <div className="col-span-12 md:col-span-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
              <StarMark size={9} />
              §&nbsp;III &middot; Plate 01
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-ink">
              Anatomy of{" "}
              <span
                className="italic text-brass-deep"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
              >
                the workspace.
              </span>
            </h2>
            <p className="mt-4 max-w-2xl font-serif text-[17px] leading-[1.55] text-ink-soft">
              Six fixed regions, each doing one thing well. The document column
              owns the scroll. Everything else — nav, photos, findings, the AI
              surveyor — observes <em className="italic">what section is in view.</em>
            </p>
          </div>
        </div>

        {/* The mock */}
        <WorkspaceMock />

        {/* Caption + labels */}
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
          <Caption
            label="A · Sticky header"
            text="Breadcrumb, completion percentage, primary action. Stays put while the document scrolls beneath it."
          />
          <Caption
            label="B · The document column"
            text="A 760-pixel column of cards. Sections stack vertically with sticky headers. Snap-scroll on proximity, never on demand."
          />
          <Caption
            label="C · The right rail"
            text="Photos, findings, vessel context, and the AI surveyor. Each panel updates to follow the section in view."
          />
        </div>
      </div>
    </section>
  );
}

function Caption({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l border-brass/60 pl-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
        {label}
      </div>
      <p className="font-serif text-[15px] leading-[1.5] text-ink-soft">
        {text}
      </p>
    </div>
  );
}

function WorkspaceMock() {
  return (
    <div className="relative">
      {/* Subtle drop-shadow paper plate */}
      <div
        className="relative overflow-hidden rounded-sm border border-ink/15 bg-paper-warm"
        style={{
          boxShadow:
            "0 1px 0 #00000010, 0 14px 30px -20px rgba(13,31,44,0.30), 0 30px 60px -40px rgba(13,31,44,0.20)",
        }}
      >
        {/* Top header bar */}
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 bg-paper-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 bg-paper text-brass-deep">
              <svg viewBox="-12 -12 24 24" width={11} height={11} aria-hidden>
                <polygon
                  points="0,-10 2,0 10,0 2,2 0,10 -2,2 -10,0 -2,0"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              Surveys
              <span className="mx-1.5 text-ink/30">/</span>
              <span className="font-serif text-[13px] normal-case italic tracking-normal text-ink">
                S/V Aurora
              </span>
              <span className="mx-1.5 text-ink/30">/</span>
              <span className="text-ink">Hull &amp; Bottom</span>
              <span className="ml-1 text-ink/40">▾</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Saved 3s ago
              </span>
            </div>
            <div className="hidden items-center gap-2 rounded-sm border border-moss/50 bg-moss/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-moss md:flex">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss" />
              In progress &middot; 62%
            </div>
            <button className="rounded-sm border border-ink bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-warm">
              Generate report →
            </button>
          </div>
        </div>

        {/* Body: doc + rail */}
        <div className="grid grid-cols-12">
          {/* Document column */}
          <div className="col-span-12 border-r border-ink/10 bg-paper/60 px-4 py-6 md:col-span-8 md:px-8 md:py-8">
            {/* Sticky section header */}
            <div className="mb-5 flex items-center justify-between border-b border-ink/10 pb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
                  Section 04 of 11
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <h3 className="font-display text-[26px] font-light leading-none text-ink">
                    Hull &amp; Bottom
                  </h3>
                  <span className="font-mono text-[12px] text-ink-muted">
                    12 / 15
                  </span>
                </div>
              </div>
              <button className="inline-flex items-center gap-2 rounded-sm border border-rust px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
                <span className="text-[14px] leading-none">+</span>
                Add finding
              </button>
            </div>

            {/* Field card 1: segmented */}
            <FieldCard label="01" name="Topside condition">
              <div className="flex flex-wrap gap-2">
                {["Excellent", "Good", "Fair", "Poor"].map((opt) => (
                  <span
                    key={opt}
                    className={
                      opt === "Good"
                        ? "rounded-sm border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper-warm"
                        : "rounded-sm border border-ink/20 bg-paper-warm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted"
                    }
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </FieldCard>

            {/* Field card 2: text notes */}
            <FieldCard label="02" name="Hull notes">
              <p className="font-serif text-[14px] leading-[1.55] text-ink-soft">
                Gelcoat is original, sound at the bow with light spider-cracking
                along the chine.{" "}
                <span className="bg-rust/15 text-ink">
                  Three small blisters
                </span>{" "}
                noted at port quarter, below waterline. No evidence of impact
                damage. Boot stripe legible, antifouling renewed within 12
                months.
              </p>
            </FieldCard>

            {/* Field card 3: photo grid */}
            <FieldCard label="03" name="Photographs · waterline">
              <div className="grid grid-cols-4 gap-2">
                {[
                  ["#2c5a6b", "#14333f"],
                  ["#6b7a4a", "#3d4929"],
                  ["#a85a3a", "#6b3a23"],
                  ["#5b6976", "#2f3a44"],
                ].map(([a, b], i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] overflow-hidden rounded-sm border border-ink/10"
                    style={{
                      background: `linear-gradient(135deg, ${a}, ${b})`,
                    }}
                  >
                    <div className="h-full w-full bg-paper/0" />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <span>4 attached</span>
                <span className="text-ink/30">·</span>
                <button className="link-rule">+ Camera</button>
                <button className="link-rule">+ From unassigned (3)</button>
              </div>
            </FieldCard>

            {/* Hint of next section */}
            <div className="mt-6 flex items-center gap-3 opacity-50">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
                Section 05
              </span>
              <span className="font-display text-[20px] font-light text-ink">
                Deck &amp; Topsides
              </span>
              <span className="ml-auto font-mono text-[11px] text-ink-muted">
                0 / 18
              </span>
            </div>
          </div>

          {/* Right rail */}
          <div className="col-span-12 bg-paper-warm/60 px-4 py-6 md:col-span-4 md:px-6 md:py-8">
            {/* Photos */}
            <RailSection label="Photos · Hull &amp; Bottom" meta="04 of 24">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  "linear-gradient(135deg,#2c5a6b,#1a3d4a)",
                  "linear-gradient(135deg,#5b6976,#1e3344)",
                  "linear-gradient(135deg,#a85a3a,#6b3a23)",
                  "linear-gradient(135deg,#6b7a4a,#3d4929)",
                  "linear-gradient(135deg,#b8845c,#8b5e3a)",
                  "linear-gradient(135deg,#2c5a6b,#14333f)",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm border border-ink/10"
                    style={{ background: bg }}
                  />
                ))}
              </div>
              <div className="mt-3 rounded-sm border border-dashed border-rust/60 bg-rust/5 px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
                  Unassigned (3)
                </div>
                <div className="mt-1 flex gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-9 w-9 rounded-sm border border-dashed border-rust/40 bg-paper-card/50"
                    />
                  ))}
                </div>
              </div>
            </RailSection>

            {/* Findings */}
            <RailSection label="Findings" meta="(3)">
              <ul className="space-y-2">
                <FindingRow
                  severity="critical"
                  text="Blistering below waterline, port quarter"
                />
                <FindingRow
                  severity="advisory"
                  text="Boot stripe weathering, starboard"
                />
                <FindingRow
                  severity="info"
                  text="Antifouling renewed Aug 2025"
                />
              </ul>
            </RailSection>

            {/* Vessel */}
            <RailSection label="Vessel" meta="">
              <dl className="space-y-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                <Row k="LOA" v="38′ 4″" />
                <Row k="Beam" v="11′ 9″" />
                <Row k="Draft" v="6′ 6″" />
                <Row k="HIN" v="USHIN8421J122" />
                <Row k="Client" v="J. Sallenger" link />
              </dl>
            </RailSection>

            {/* AI Surveyor pinned bottom */}
            <div className="mt-6 rounded-sm border border-ocean-deep/40 bg-ocean-deep/5 p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ocean-deep">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ocean pulse-dot" />
                  AI Surveyor
                </div>
                <span className="font-mono text-[10px] text-ink-muted">⌘K</span>
              </div>
              <p className="font-serif text-[12px] italic leading-[1.45] text-ink-soft">
                &ldquo;Ask about blistering severity, gelcoat repair specs, or
                anything else on this section…&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* bottom caption strip */}
        <div className="flex items-center justify-between border-t border-ink/10 bg-paper-card/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted md:px-6">
          <span>Plate 01 — workspace at scale 1:1</span>
          <span>Engraved Newport, R.I. — Spring MMXXVI</span>
        </div>
      </div>

      {/* Decorative corner annotations */}
      <div className="pointer-events-none absolute -left-2 -top-2 h-6 w-6 border-l border-t border-ink/40 hidden md:block" />
      <div className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 border-r border-t border-ink/40 hidden md:block" />
      <div className="pointer-events-none absolute -left-2 -bottom-2 h-6 w-6 border-l border-b border-ink/40 hidden md:block" />
      <div className="pointer-events-none absolute -right-2 -bottom-2 h-6 w-6 border-r border-b border-ink/40 hidden md:block" />
    </div>
  );
}

function FieldCard({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-sm border border-ink/12 bg-paper-card px-4 py-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          Field {label}
        </div>
        <div className="font-display text-[15px] text-ink">{name}</div>
      </div>
      {children}
    </div>
  );
}

function RailSection({
  label,
  meta,
  children,
}: {
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-ink/10 pb-5 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
        <span dangerouslySetInnerHTML={{ __html: label }} />
        <span className="text-ink-muted">{meta}</span>
      </div>
      {children}
    </div>
  );
}

function FindingRow({
  severity,
  text,
}: {
  severity: "critical" | "advisory" | "info";
  text: string;
}) {
  const tone =
    severity === "critical"
      ? "bg-rust border-rust text-paper-warm"
      : severity === "advisory"
        ? "bg-brass border-brass-deep text-paper-warm"
        : "bg-ocean border-ocean-deep text-paper-warm";
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full border ${tone}`}
      />
      <span className="font-serif text-[13px] leading-[1.4] text-ink-soft">
        {text}
      </span>
    </li>
  );
}

function Row({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{k}</dt>
      <dd
        className={
          link
            ? "link-rule normal-case tracking-normal text-ink"
            : "text-ink"
        }
      >
        {v}
      </dd>
    </div>
  );
}
