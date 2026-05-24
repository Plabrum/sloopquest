import { NauticalRule } from "./marks";

type Tone = "default" | "warm" | "ink";
type Size = "default" | "lg";

const toneClass: Record<Tone, string> = {
  default: "",
  warm: "bg-paper-warm/40",
  ink: "bg-ink text-paper-warm",
};

const ruleToneClass: Record<Tone, string> = {
  default: "text-ink/40",
  warm: "text-ink/40",
  ink: "text-paper-warm/40",
};

const sizeClass: Record<Size, string> = {
  default: "py-20 md:py-28",
  lg: "py-24 md:py-36",
};

export function Plate({
  children,
  tone = "default",
  size = "default",
  className = "",
  id,
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-20 ${toneClass[tone]} ${className}`}
    >
      <NauticalRule className={`h-3 w-full ${ruleToneClass[tone]}`} />
      <div className={`mx-auto max-w-[1440px] px-6 md:px-10 ${sizeClass[size]}`}>
        {children}
      </div>
    </section>
  );
}
