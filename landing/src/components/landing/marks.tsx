import { CSSProperties, SVGProps } from "react";

export function CompassRose({
  size = 320,
  className = "",
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number }) {
  // NOAA-style double rose: outer true-north ring, inner magnetic ring
  // offset by a declination (~14° W on the US east coast).
  const declination = -14;
  const outerTicks = Array.from({ length: 360 }, (_, i) => i);
  const innerTicks = Array.from({ length: 72 }, (_, i) => i * 5);

  const ink = "#1e3344";
  const inkSoft = "#4a6478";

  return (
    <svg
      viewBox="-120 -120 240 240"
      width={size}
      height={size}
      className={className}
      aria-hidden
      {...rest}
    >
      {/* Outer true-north ring */}
      <circle r="112" fill="none" stroke={ink} strokeWidth="0.5" />
      <circle r="104" fill="none" stroke={ink} strokeWidth="0.5" />

      {/* Outer degree marks — every 1° hairline, every 5° medium, every 10° long, every 30° labeled */}
      <g stroke={ink}>
        {outerTicks.map((deg) => {
          const isTen = deg % 10 === 0;
          const isFive = deg % 5 === 0;
          const r1 = 112;
          const r2 = isTen ? 104 : isFive ? 107 : 110;
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={Math.sin(rad) * r1}
              y1={-Math.cos(rad) * r1}
              x2={Math.sin(rad) * r2}
              y2={-Math.cos(rad) * r2}
              strokeWidth={isTen ? 0.6 : 0.3}
            />
          );
        })}
      </g>

      {/* Outer degree labels at every 30° */}
      <g
        fill={ink}
        fontFamily="var(--font-mono, ui-monospace)"
        fontSize="5.2"
        textAnchor="middle"
      >
        {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const r = 99;
          const x = Math.sin(rad) * r;
          const y = -Math.cos(rad) * r + 1.8;
          return (
            <text key={deg} x={x} y={y}>
              {String(deg).padStart(3, "0")}
            </text>
          );
        })}
      </g>

      {/* Inner magnetic ring */}
      <g transform={`rotate(${declination})`}>
        <circle r="86" fill="none" stroke={inkSoft} strokeWidth="0.4" />
        <circle r="80" fill="none" stroke={inkSoft} strokeWidth="0.4" />

        <g stroke={inkSoft}>
          {innerTicks.map((deg) => {
            const isMajor = deg % 30 === 0;
            const isMid = deg % 15 === 0;
            const r1 = 86;
            const r2 = isMajor ? 78 : isMid ? 81 : 83.5;
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={Math.sin(rad) * r1}
                y1={-Math.cos(rad) * r1}
                x2={Math.sin(rad) * r2}
                y2={-Math.cos(rad) * r2}
                strokeWidth={isMajor ? 0.5 : 0.3}
              />
            );
          })}
        </g>

        {/* Magnetic N marker — small arrowhead */}
        <polygon points="0,-86 2.2,-80 -2.2,-80" fill={inkSoft} />
      </g>

      {/* Cross-hairs through center extending across rings */}
      <g stroke={ink} strokeWidth="0.4">
        <line x1="-112" y1="0" x2="112" y2="0" />
        <line x1="0" y1="-112" x2="0" y2="112" />
      </g>

      {/* Small center tick */}
      <g stroke={ink} strokeWidth="0.5">
        <line x1="-3" y1="0" x2="3" y2="0" />
        <line x1="0" y1="-3" x2="0" y2="3" />
      </g>

      {/* MAGNETIC label arched above center */}
      <g
        fill={inkSoft}
        fontFamily="var(--font-mono, ui-monospace)"
        fontSize="4.4"
        textAnchor="middle"
        style={{ letterSpacing: "0.18em" }}
      >
        <text x="0" y="-30">MAGNETIC</text>
      </g>

      {/* Variation annotation — classic NOAA inscription */}
      <g
        fill={ink}
        fontFamily="var(--font-mono, ui-monospace)"
        fontSize="4.2"
        textAnchor="middle"
        style={{ letterSpacing: "0.05em" }}
      >
        <text x="0" y="16">VAR 14°15′W (2026)</text>
        <text x="0" y="22" fontSize="3.6" opacity="0.75">
          ANNUAL DECREASE 2′
        </text>
      </g>
    </svg>
  );
}

export function Soundings({
  className = "",
  count = 90,
  seed = 1851,
  style,
}: {
  className?: string;
  count?: number;
  seed?: number;
  style?: CSSProperties;
}) {
  // Mulberry32 — small deterministic PRNG so SSR/CSR match.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  const bottoms = ["M", "S", "fS", "Sh", "Co"] as const;
  const points = Array.from({ length: count }, () => {
    const isBottom = rand() < 0.12;
    return {
      left: rand() * 100,
      top: rand() * 100,
      value: isBottom ? pick(bottoms) : String(2 + Math.floor(rand() * 28)),
      rotate: (rand() - 0.5) * 14,
      italic: isBottom,
    };
  });

  return (
    <div
      className={`pointer-events-none select-none font-mono text-[10px] text-ink ${className}`}
      style={style}
      aria-hidden
    >
      {points.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: `${p.top}%`,
            transform: `rotate(${p.rotate}deg)`,
            fontStyle: p.italic ? "italic" : "normal",
          }}
        >
          {p.value}
        </span>
      ))}
    </div>
  );
}

export function StarMark({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="-12 -12 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <polygon
        points="0,-10 2,0 10,0 2,2 0,10 -2,2 -10,0 -2,0"
        fill="currentColor"
      />
    </svg>
  );
}

export function NauticalRule({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 12"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <line x1="0" y1="6" x2="1200" y2="6" stroke="currentColor" strokeWidth="0.6" />
      <g stroke="currentColor" opacity="0.7">
        {Array.from({ length: 96 }, (_, i) => i).map((i) => {
          const x = (i + 1) * 12.5;
          const major = i % 8 === 7;
          return (
            <line
              key={i}
              x1={x}
              y1={major ? 2 : 4}
              x2={x}
              y2={major ? 10 : 8}
              strokeWidth={major ? 0.5 : 0.4}
            />
          );
        })}
      </g>
    </svg>
  );
}

export function AnchorGlyph({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="16" cy="6" r="2.4" />
      <path d="M16 8.4v18" />
      <path d="M11 12h10" />
      <path d="M5 19c0 5 5 8 11 8s11-3 11-8" />
      <path d="M5 19l-2.5 1.6M5 19l2.6 1.6M27 19l2.5 1.6M27 19l-2.6 1.6" />
    </svg>
  );
}

export function TopoLines({ className = "" }: { className?: string }) {
  // Abstract topographic-line decoration
  return (
    <svg
      viewBox="0 0 600 400"
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.7">
        <path d="M-20 60 C 120 40, 240 90, 360 70 S 580 100, 640 80" />
        <path d="M-20 110 C 110 100, 250 140, 380 120 S 560 150, 640 130" />
        <path d="M-20 160 C 130 150, 260 190, 380 170 S 590 195, 640 175" />
        <path d="M-20 210 C 110 220, 270 230, 380 215 S 580 240, 640 220" />
        <path d="M-20 260 C 100 260, 260 280, 380 260 S 590 290, 640 268" />
        <path d="M-20 310 C 130 300, 270 330, 380 310 S 590 340, 640 320" />
        <path d="M-20 360 C 110 365, 270 380, 380 360 S 590 388, 640 366" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display text-[15px] tracking-[0.32em] uppercase ${className}`}
    >
      <StarMark size={11} className="text-brass-deep" />
      <span className="text-ink" style={{ fontWeight: 500 }}>
        Sloopquest
      </span>
    </span>
  );
}
