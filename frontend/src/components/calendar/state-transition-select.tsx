import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  statusVariantClasses,
  statusDotClasses,
} from "@/lib/status-colors";
import type { ActionDTO } from "@/lib/actions/types";

interface Props {
  currentState: string;
  options: ActionDTO[];
  onSelect: (action: ActionDTO) => void;
  disabled?: boolean;
}

const badgeBase =
  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium uppercase leading-none tracking-wide";

export function StateTransitionSelect({
  currentState,
  options,
  onSelect,
  disabled,
}: Props) {
  const config = getStatusConfig(currentState);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          badgeBase,
          statusVariantClasses[config.variant],
          "transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span
          className={cn("h-2 w-2 rounded-full", statusDotClasses[config.variant])}
        />
        {config.label}
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-0 p-1">
        {options.map((a) => {
          const target = getStatusConfig(a.label);
          return (
            <DropdownMenuItem
              key={a.action}
              onSelect={() => onSelect(a)}
              className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
            >
              <span
                className={cn(
                  badgeBase,
                  statusVariantClasses[target.variant],
                  "w-full cursor-pointer transition-opacity hover:opacity-80",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    statusDotClasses[target.variant],
                  )}
                />
                {target.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
