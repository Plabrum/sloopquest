export type WorkspaceFooterProps = {
  left: string;
  right: string;
};

export function WorkspaceFooter({ left, right }: WorkspaceFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-ink/10 bg-paper-card/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted md:px-6">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
