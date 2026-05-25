import { Suspense, type ComponentType } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueryBoundary } from "@/components/query-boundary";
import { useListOnboardingSuspense } from "@/openapi/onboarding/onboarding";
import { OnboardingState } from "@/openapi/litestarAPI.schemas";
import { cn } from "@/lib/utils";
import { InboxStep } from "./inbox-step";
import { PricingStep } from "./pricing-step";

type StepDef = {
  state: OnboardingState;
  title: string;
  description: string;
  Body: ComponentType;
};

const STEPS: StepDef[] = [
  {
    state: OnboardingState.inbox,
    title: "Claim your inbox",
    description:
      "Pick a short name for your Sloopquest inbox. This is permanent and cannot be changed later.",
    Body: InboxStep,
  },
  {
    state: OnboardingState.pricing,
    title: "Set up your pricing",
    description:
      "Define one or more pricing tiers. Use length ranges for per-foot or size-based pricing, or stick with a single flat rate.",
    Body: PricingStep,
  },
];

function OnboardingModalContent() {
  const { data: list } = useListOnboardingSuspense({ limit: 1 });
  const onboarding = list.items[0];

  const open = onboarding != null && onboarding.state !== OnboardingState.completed;
  if (!open) {
    return null;
  }

  const foundIdx = STEPS.findIndex((s) => s.state === onboarding.state);
  const currentIdx = foundIdx === -1 ? 0 : foundIdx;
  const step = STEPS[currentIdx];
  const { Body } = step;

  return (
    <Dialog open={true} modal={true}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        <StepDots count={STEPS.length} currentIdx={currentIdx} />
        <QueryBoundary resetKey={step.state}>
          <Body />
        </QueryBoundary>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ count, currentIdx }: { count: number; currentIdx: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={currentIdx + 1}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            i <= currentIdx ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingModal() {
  return (
    <Suspense>
      <OnboardingModalContent />
    </Suspense>
  );
}
