interface CategoryBadgeProps {
  label: string;
  bg: string;
  text: string;
}

export function CategoryBadge({ label, bg, text }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
