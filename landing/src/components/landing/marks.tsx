import { SVGProps } from "react";

export function CompassRose({
  size = 320,
  className = "",
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number }) {
  // Build degree marks
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg
      viewBox="-120 -120 240 240"
      width={size}
      height={size}
      className={className}
      aria-hidden
      {...rest}
    >
      <defs>
        <radialGradient id="compass-paper" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#faf2de" />
          <stop offset="100%" stopColor="#ede2c4" />
        </radialGradient>
      </defs>

      {/* outer ring */}
      <circle r="115" fill="url(#compass-paper)" stroke="#1e3344" strokeWidth="0.6" />
      <circle r="108" fill="none" stroke="#1e3344" strokeWidth="0.4" />
      <circle r="78" fill="none" stroke="#1e3344" strokeWidth="0.4" />
      <circle r="40" fill="none" stroke="#1e3344" strokeWidth="0.3" />

      {/* degree marks */}
      <g stroke="#1e3344">
        {ticks.map((deg) => {
          const isMajor = deg % 30 === 0;
          const isMid = deg % 15 === 0;
          const r1 = 108;
          const r2 = isMajor ? 96 : isMid ? 101 : 104;
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.sin(rad) * r1;
          const y1 = -Math.cos(rad) * r1;
          const x2 = Math.sin(rad) * r2;
          const y2 = -Math.cos(rad) * r2;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={isMajor ? 0.8 : 0.4}
            />
          );
        })}
      </g>

      {/* secondary 4-point star (NE/SE/SW/NW) — back layer */}
      <g
        fill="#e6dbc1"
        stroke="#1e3344"
        strokeWidth="0.5"
        strokeLinejoin="round"
      >
        <polygon points="0,-78 8,0 0,8 -8,0" transform="rotate(45)" />
        <polygon points="0,-78 8,0 0,8 -8,0" transform="rotate(135)" />
        <polygon points="0,-78 8,0 0,8 -8,0" transform="rotate(225)" />
        <polygon points="0,-78 8,0 0,8 -8,0" transform="rotate(315)" />
      </g>

      {/* main 4-point star (N/E/S/W) — brass front layer */}
      <g stroke="#0d1f2c" strokeWidth="0.6" strokeLinejoin="round">
        {/* N — brass solid */}
        <polygon points="0,-105 10,0 0,6 -10,0" fill="#b8845c" />
        {/* E */}
        <polygon points="0,-105 10,0 0,6 -10,0" fill="#d4a677" transform="rotate(90)" />
        {/* S */}
        <polygon points="0,-105 10,0 0,6 -10,0" fill="#b8845c" transform="rotate(180)" />
        {/* W */}
        <polygon points="0,-105 10,0 0,6 -10,0" fill="#d4a677" transform="rotate(270)" />
      </g>

      {/* N hollow indicator (engraver style) */}
      <polygon
        points="0,-105 6,-30 -6,-30"
        fill="#0d1f2c"
      />

      {/* center pin */}
      <circle r="6" fill="#faf2de" stroke="#0d1f2c" strokeWidth="0.6" />
      <circle r="2" fill="#0d1f2c" />

      {/* cardinal labels */}
      <g
        fill="#0d1f2c"
        fontFamily="var(--font-display)"
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
        style={{ letterSpacing: "0.12em" }}
      >
        <text x="0" y="-86">N</text>
        <text x="86" y="4">E</text>
        <text x="0" y="92">S</text>
        <text x="-86" y="4">W</text>
      </g>
    </svg>
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
      {Array.from({ length: 60 }, (_, i) => i).map((i) => {
        const x = (i + 1) * 20;
        const major = i % 5 === 4;
        return (
          <line
            key={i}
            x1={x}
            y1={major ? 0 : 3}
            x2={x}
            y2={major ? 12 : 9}
            stroke="currentColor"
            strokeWidth="0.6"
          />
        );
      })}
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
