import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateAction =
  | { label: string; to: string; variant?: "default" | "outline" }
  | { label: string; onClick: () => void; variant?: "default" | "outline" };

interface ErrorStateProps {
  icon: React.ReactNode;
  iconTone?: "neutral" | "warning" | "danger";
  title: string;
  description: React.ReactNode;
  primaryAction?: ErrorStateAction;
  secondaryAction?: ErrorStateAction;
}

const TONE_CLASSES: Record<NonNullable<ErrorStateProps["iconTone"]>, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  warning: "bg-[var(--status-warning)]/10 text-[var(--status-warning)] ring-[var(--status-warning)]/30",
  danger: "bg-[var(--status-danger)]/10 text-[var(--status-danger)] ring-[var(--status-danger)]/30",
};

function ActionButton({ action }: { action: ErrorStateAction }) {
  const variant = action.variant ?? "default";
  if ("to" in action) {
    return (
      <Button asChild variant={variant} className="w-full">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} className="w-full" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function ErrorState({
  icon,
  iconTone = "neutral",
  title,
  description,
  primaryAction,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-10 shadow-sm">
        <div className="space-y-5 text-center">
          <div
            className={cn(
              "mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-1 [&_svg]:size-5",
              TONE_CLASSES[iconTone],
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div>
            <h1 className="font-display mb-2 text-lg font-normal text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {(primaryAction ?? secondaryAction) && (
            <div className="space-y-2 pt-1">
              {primaryAction && <ActionButton action={primaryAction} />}
              {secondaryAction && <ActionButton action={secondaryAction} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
