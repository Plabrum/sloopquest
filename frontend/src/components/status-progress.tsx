import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | "current" | "upcoming";

export interface StatusProgressStep {
  label: string;
  status: StepStatus;
}

interface StatusProgressProps {
  steps: StatusProgressStep[];
}

const stepStyles: Record<
  StepStatus,
  { circle: string; check: boolean; label: string }
> = {
  completed: {
    circle: "bg-[#A7D5B8] border-2 border-[#7A9E87]",
    check: true,
    label: "text-[#7A9E87]",
  },
  current: {
    circle: "bg-[#F4B183] border-2 border-[#C4714A]",
    check: false,
    label: "text-[#C4714A]",
  },
  upcoming: {
    circle: "bg-transparent border-2 border-[#6D6C6A]",
    check: false,
    label: "text-[#6D6C6A]",
  },
};

function getLineColor(
  leftStatus: StepStatus,
  rightStatus: StepStatus,
): string {
  if (leftStatus === "completed" && rightStatus === "completed") {
    return "bg-[#A7D5B8]";
  }
  if (leftStatus === "completed" && rightStatus === "current") {
    return "bg-[#F4B183]";
  }
  return "bg-[#E5E4E1]";
}

export function StatusProgress({ steps }: StatusProgressProps) {
  return (
    <div className="flex w-full items-center px-5 py-3">
      {steps.map((step, i) => {
        const style = stepStyles[step.status];
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="contents">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  style.circle,
                )}
              >
                {style.check && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap font-sans text-[11px] font-semibold",
                  style.label,
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  "h-0.5 flex-1",
                  getLineColor(step.status, steps[i + 1].status),
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
