export function SectionHeader({
  kicker,
  title,
  progress,
  action,
}: {
  kicker: string;
  title: string;
  progress: string;
  action: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between border-b border-ink/10 pb-4">
      <div>
        <div className="t-kicker">{kicker}</div>
        <div className="mt-1 flex items-baseline gap-3">
          <h3 className="font-display text-[26px] font-light leading-none text-ink">
            {title}
          </h3>
          <span className="font-mono text-[12px] text-ink-muted">
            {progress}
          </span>
        </div>
      </div>
      <button className="inline-flex items-center gap-2 rounded-sm border border-rust px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
        <span className="text-[14px] leading-none">+</span>
        {action}
      </button>
    </div>
  );
}

export function NextSectionHint({
  kicker,
  title,
  progress,
}: {
  kicker: string;
  title: string;
  progress: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 opacity-50">
      <span className="t-kicker">{kicker}</span>
      <span className="font-display text-[20px] font-light text-ink">
        {title}
      </span>
      <span className="ml-auto font-mono text-[11px] text-ink-muted">
        {progress}
      </span>
    </div>
  );
}
