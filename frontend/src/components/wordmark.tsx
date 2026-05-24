type StarMarkProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function StarMark({ size = 14, className = "", style }: StarMarkProps) {
  return (
    <svg
      viewBox="-12 -12 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden
    >
      <polygon
        points="0,-10 2,0 10,0 2,2 0,10 -2,2 -10,0 -2,0"
        fill="currentColor"
      />
    </svg>
  );
}

export function Wordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? { text: "12px", star: 9, gap: "gap-2" }
      : size === "lg"
        ? { text: "20px", star: 14, gap: "gap-3" }
        : { text: "15px", star: 11, gap: "gap-2.5" };

  return (
    <span
      className={`inline-flex items-center uppercase text-foreground ${dims.gap} ${className}`}
      style={{
        fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif",
        fontSize: dims.text,
        letterSpacing: "0.32em",
        fontWeight: 500,
      }}
    >
      <StarMark size={dims.star} style={{ color: "#b8845c" }} />
      <span>Sloopquest</span>
    </span>
  );
}
