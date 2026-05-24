export function ChoicePill({
  label,
  selected,
}: {
  label: string;
  selected?: boolean;
}) {
  const base =
    "rounded-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]";
  const tone = selected
    ? "border-ink bg-ink text-paper-warm"
    : "border-ink/20 bg-paper-warm text-ink-muted";
  return <span className={`${base} ${tone}`}>{label}</span>;
}

export function FieldCard({
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
      <div className="mb-3 flex items-baseline gap-2.5 border-b border-ink/8 pb-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
          Field {label}
        </span>
        <span className="text-ink/25" aria-hidden>
          ·
        </span>
        <span className="font-display text-[16px] font-light leading-none text-ink">
          {name}
        </span>
      </div>
      {children}
    </div>
  );
}

export function RailSection({
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
        <span>{label}</span>
        <span className="text-ink-muted">{meta}</span>
      </div>
      {children}
    </div>
  );
}

export function FindingRow({
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

export function Row({
  k,
  v,
  link,
}: {
  k: string;
  v: string;
  link?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{k}</dt>
      <dd
        className={
          link ? "link-rule normal-case tracking-normal text-ink" : "text-ink"
        }
      >
        {v}
      </dd>
    </div>
  );
}
