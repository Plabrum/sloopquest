interface LoadingOrbProps {
  size?: number;
  showPulseRing?: boolean;
  className?: string;
}

export function LoadingOrb({
  size = 280,
  showPulseRing = false,
  className,
}: LoadingOrbProps) {
  const blur = Math.round(size * 0.14);
  const ringSize = Math.round(size * (340 / 280));

  return (
    <>
      <style>{`
        @keyframes orb-rotate-1 {
          0%   { transform: translate(-10%, -15%) rotate(0deg) scale(1); }
          50%  { transform: translate(5%, 10%) rotate(180deg) scale(1.1); }
          100% { transform: translate(-10%, -15%) rotate(360deg) scale(1); }
        }
        @keyframes orb-rotate-2 {
          0%   { transform: translate(20%, -20%) rotate(0deg) scale(1.05); }
          50%  { transform: translate(-5%, 15%) rotate(-180deg) scale(0.95); }
          100% { transform: translate(20%, -20%) rotate(-360deg) scale(1.05); }
        }
        @keyframes orb-rotate-3 {
          0%   { transform: translate(-20%, 20%) rotate(0deg) scale(0.9); }
          33%  { transform: translate(15%, -10%) rotate(120deg) scale(1.1); }
          66%  { transform: translate(-5%, -20%) rotate(240deg) scale(0.95); }
          100% { transform: translate(-20%, 20%) rotate(360deg) scale(0.9); }
        }
        @keyframes orb-rotate-4 {
          0%   { transform: translate(10%, 20%) rotate(0deg) scale(1.05); }
          40%  { transform: translate(-15%, -10%) rotate(150deg) scale(0.9); }
          70%  { transform: translate(20%, -15%) rotate(270deg) scale(1.1); }
          100% { transform: translate(10%, 20%) rotate(360deg) scale(1.05); }
        }
        @keyframes orb-rotate-5 {
          0%   { transform: translate(-5%, -25%) rotate(0deg) scale(0.95); }
          50%  { transform: translate(15%, 20%) rotate(-200deg) scale(1.05); }
          100% { transform: translate(-5%, -25%) rotate(-360deg) scale(0.95); }
        }
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes orb-pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.5; }
          50%  { transform: scale(1.08); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>
      <div
        className={className}
        style={{
          width: size,
          height: size,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showPulseRing && (
          <div
            style={{
              position: "absolute",
              width: ringSize,
              height: ringSize,
              borderRadius: "50%",
              border: "1.5px solid color-mix(in oklch, var(--foreground) 30%, transparent)",
              animation: "orb-pulse-ring 4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            animation: "orb-breathe 6s ease-in-out infinite",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              filter: `blur(${blur}px)`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "80%",
                height: "80%",
                top: "5%",
                left: "5%",
                borderRadius: "50%",
                opacity: 0.9,
                background:
                  "radial-gradient(circle at 40% 40%, var(--primary) 0%, var(--primary) 70%, transparent 100%)",
                animation: "orb-rotate-1 5s ease-in-out infinite",
                transformOrigin: "center center",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "75%",
                height: "75%",
                top: "15%",
                left: "20%",
                borderRadius: "50%",
                opacity: 0.6,
                background:
                  "radial-gradient(circle at 60% 35%, var(--muted-foreground) 0%, var(--muted-foreground) 70%, transparent 100%)",
                animation: "orb-rotate-2 7s ease-in-out infinite",
                transformOrigin: "center center",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "70%",
                height: "70%",
                top: "20%",
                left: "8%",
                borderRadius: "50%",
                opacity: 0.5,
                background:
                  "radial-gradient(circle at 45% 55%, var(--accent-foreground) 0%, var(--accent-foreground) 70%, transparent 100%)",
                animation: "orb-rotate-3 9s ease-in-out infinite",
                transformOrigin: "center center",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "65%",
                height: "65%",
                top: "8%",
                left: "25%",
                borderRadius: "50%",
                opacity: 0.6,
                background:
                  "radial-gradient(circle at 50% 50%, var(--muted-foreground) 0%, var(--muted-foreground) 70%, transparent 100%)",
                animation: "orb-rotate-4 6s ease-in-out infinite",
                transformOrigin: "center center",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "60%",
                height: "60%",
                top: "18%",
                left: "15%",
                borderRadius: "50%",
                opacity: 0.7,
                background:
                  "radial-gradient(circle at 40% 40%, var(--primary) 0%, var(--primary) 70%, transparent 100%)",
                animation: "orb-rotate-5 4s ease-in-out infinite",
                transformOrigin: "center center",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export const GloriaOrb = LoadingOrb;
