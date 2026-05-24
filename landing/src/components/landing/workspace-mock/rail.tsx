import { FindingRow, RailSection, Row } from "./primitives";

export function RightRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-12 bg-paper-warm/60 px-4 py-6 md:col-span-4 md:px-6 md:py-8">
      {children}
    </div>
  );
}

export function PhotosRail({
  label,
  meta,
  thumbs,
  unassignedLabel,
  unassignedCount,
}: {
  label: string;
  meta: string;
  thumbs: string[];
  unassignedLabel: string;
  unassignedCount: number;
}) {
  return (
    <RailSection label={label} meta={meta}>
      <div className="grid grid-cols-3 gap-1.5">
        {thumbs.map((bg, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm border border-ink/10"
            style={{ background: bg }}
          />
        ))}
      </div>
      <div className="mt-3 rounded-sm border border-dashed border-rust/60 bg-rust/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
          {unassignedLabel}
        </div>
        <div className="mt-1 flex gap-1.5">
          {Array.from({ length: unassignedCount }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-9 rounded-sm border border-dashed border-rust/40 bg-paper-card/50"
            />
          ))}
        </div>
      </div>
    </RailSection>
  );
}

type Finding = { severity: "critical" | "advisory" | "info"; text: string };

export function FindingsRail({
  label,
  meta,
  items,
}: {
  label: string;
  meta: string;
  items: Finding[];
}) {
  return (
    <RailSection label={label} meta={meta}>
      <ul className="space-y-2">
        {items.map((f, i) => (
          <FindingRow key={i} severity={f.severity} text={f.text} />
        ))}
      </ul>
    </RailSection>
  );
}

export function VesselRail({
  label,
  rows,
}: {
  label: string;
  rows: { k: string; v: string; link?: boolean }[];
}) {
  return (
    <RailSection label={label} meta="">
      <dl className="space-y-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        {rows.map((r) => (
          <Row key={r.k} k={r.k} v={r.v} link={r.link} />
        ))}
      </dl>
    </RailSection>
  );
}

export function AISurveyor({
  label,
  shortcut,
  placeholder,
}: {
  label: string;
  shortcut: string;
  placeholder: string;
}) {
  return (
    <div className="mt-6 rounded-sm border border-ocean-deep/40 bg-ocean-deep/5 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ocean-deep">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ocean pulse-dot" />
          {label}
        </div>
        <span className="font-mono text-[10px] text-ink-muted">{shortcut}</span>
      </div>
      <p className="font-serif text-[12px] italic leading-[1.45] text-ink-soft">
        &ldquo;{placeholder}&rdquo;
      </p>
    </div>
  );
}
