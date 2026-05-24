import { AlertCircle, Clock, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  describeRequirement,
  type ConnectAccountRequirements,
} from "@/lib/connect";
import { statusDotClasses, statusVariantClasses } from "@/lib/status-colors";

interface ConnectRequirementsProps {
  requirements: ConnectAccountRequirements;
  onResolve?: (key: string) => void;
  className?: string;
}

interface RequirementItem {
  key: string;
  label: string;
}

function dedupe(keys: string[]): RequirementItem[] {
  const seen = new Set<string>();
  const items: RequirementItem[] = [];
  for (const key of keys) {
    const label = describeRequirement(key);
    const dedupeKey = `${label}::${key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    items.push({ key, label });
  }
  return items;
}

function StatusPill({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  const variant = enabled ? "active" : "warning";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium",
        statusVariantClasses[variant],
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", statusDotClasses[variant])}
      />
      {label}: {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function Section({
  title,
  description,
  icon,
  iconClass,
  items,
  emptyHint,
  onResolve,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  items: RequirementItem[];
  emptyHint?: string;
  onResolve?: (key: string) => void;
}) {
  if (items.length === 0 && !emptyHint) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex size-4", iconClass)}>{icon}</span>
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.key}
                </span>
              </div>
              {onResolve && (
                <button
                  type="button"
                  onClick={() => onResolve(item.key)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Resolve
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConnectRequirements({
  requirements,
  onResolve,
  className,
}: ConnectRequirementsProps) {
  const currentlyDueSet = new Set(requirements.currently_due);
  const comingUpKeys = requirements.eventually_due.filter(
    (key) => !currentlyDueSet.has(key),
  );

  const actionRequired = dedupe(requirements.currently_due);
  const pending = dedupe(requirements.pending_verification);
  const comingUp = dedupe(comingUpKeys);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap gap-2">
        <StatusPill enabled={requirements.charges_enabled} label="Charges" />
        <StatusPill enabled={requirements.payouts_enabled} label="Payouts" />
      </div>

      <Section
        title="Action required"
        description="These items are blocking payouts. Complete them to activate your account."
        icon={<AlertCircle className="size-4" />}
        iconClass="text-[var(--status-warning,#874E14)]"
        items={actionRequired}
        emptyHint="Nothing to do right now."
        onResolve={onResolve}
      />

      <Section
        title="Pending verification"
        description="Submitted to Stripe and awaiting review. No action needed."
        icon={<Clock className="size-4" />}
        iconClass="text-muted-foreground"
        items={pending}
      />

      <Section
        title="Coming up"
        description="Not yet due, but will be required to keep payouts active."
        icon={<ListChecks className="size-4" />}
        iconClass="text-muted-foreground"
        items={comingUp}
      />
    </div>
  );
}
