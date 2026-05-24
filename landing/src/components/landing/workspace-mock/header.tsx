export type WorkspaceHeaderProps = {
  crumbs: { label: string; italic?: boolean }[];
  status: { label: string; tone?: "moss" | "rust" | "brass" };
  cta: string;
};

export function WorkspaceHeader({ crumbs, status, cta }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/10 bg-paper-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1.5 text-ink/30">/</span>}
              {c.italic ? (
                <span className="font-serif text-[13px] normal-case italic tracking-normal text-ink">
                  {c.label}
                </span>
              ) : (
                <span className={i === 0 ? "text-ink-soft" : "text-ink"}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
          <span className="ml-1 text-ink/40">▾</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusPill {...status} />
        <button className="rounded-sm border border-ink bg-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-warm">
          {cta} →
        </button>
      </div>
    </div>
  );
}

function StatusPill({ label, tone = "moss" }: WorkspaceHeaderProps["status"]) {
  const toneClass = {
    moss: "border-moss/50 bg-moss/10 text-moss",
    rust: "border-rust/50 bg-rust/10 text-rust",
    brass: "border-brass-deep/50 bg-brass/10 text-brass-deep",
  }[tone];
  const dotClass = {
    moss: "bg-moss",
    rust: "bg-rust",
    brass: "bg-brass-deep",
  }[tone];
  return (
    <div
      className={`hidden items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] md:flex ${toneClass}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}
