import { getInitials, getColorByHash } from "@/lib/format";

interface AvatarNameCellProps {
  id: string;
  name: string;
  subtitle?: string | null;
}

export function AvatarNameCell({ id, name, subtitle }: AvatarNameCellProps) {
  const initials = getInitials(name);
  const colors = getColorByHash(id);
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
