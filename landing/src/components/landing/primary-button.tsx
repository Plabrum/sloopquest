import Link from "next/link";
import { StarMark } from "./marks";

type Size = "compact" | "default";

const sizeClass: Record<Size, string> = {
  compact: "gap-2 px-3 py-2.5 text-[10px] tracking-[0.18em] sm:px-4 sm:text-[11px]",
  default: "gap-3 px-8 py-4 text-[12px] tracking-[0.22em]",
};

export function PrimaryButton({
  href,
  children,
  size = "default",
  showStar = true,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  size?: Size;
  showStar?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center whitespace-nowrap border border-ink bg-ink font-mono uppercase text-paper-warm transition-all hover:bg-ocean-deep ${sizeClass[size]} ${className}`}
    >
      {showStar && <StarMark size={9} className="text-brass-light" />}
      {children}
      <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}
