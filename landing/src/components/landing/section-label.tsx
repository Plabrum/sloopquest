import { StarMark } from "./marks";

export function SectionLabel({
  numeral,
  title,
  tone = "default",
  className = "",
}: {
  numeral?: string;
  title: string;
  tone?: "default" | "light";
  className?: string;
}) {
  const color = tone === "light" ? "text-brass-light" : "text-brass-deep";
  return (
    <div
      className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] ${color} ${className}`}
    >
      <StarMark size={9} />
      {numeral ? (
        <span>
          §&nbsp;{numeral} &middot; {title}
        </span>
      ) : (
        <span>{title}</span>
      )}
    </div>
  );
}
