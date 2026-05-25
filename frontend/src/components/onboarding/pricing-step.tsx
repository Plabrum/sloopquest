import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionsActionGroupExecuteAction } from "@/openapi/actions/actions";
import {
  useListPricingGuideSuspense,
  usePricingGuidesIdDetailHandlerSuspense,
} from "@/openapi/pricing-guides/pricing-guides";
import { useListPricingTierSuspense } from "@/openapi/pricing-tiers/pricing-tiers";
import type {
  ActionsActionGroupExecuteActionBody,
  PricingType,
  ServiceType,
} from "@/openapi/litestarAPI.schemas";

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "pre_purchase", label: "Pre-purchase Survey" },
  { value: "insurance", label: "Insurance Survey" },
  { value: "damage", label: "Damage Survey" },
  { value: "sea_trial", label: "Sea Trial" },
  { value: "delivery", label: "Delivery Captain" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
];

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

type TierDraft = {
  pricing_type: PricingType;
  amount_dollars: string;
  length_until_ft: string;
};

function emptyTier(): TierDraft {
  return {
    pricing_type: "flat",
    amount_dollars: "600.00",
    length_until_ft: "",
  };
}

export function PricingStep() {
  const { data: list } = useListPricingGuideSuspense({
    filters: [{ type: "boolean", column: "is_active", value: true }],
    limit: 1,
  });
  const activeGuide = list.items[0];

  if (!activeGuide) {
    return (
      <p className="text-sm text-destructive">
        No active pricing guide. Please reload.
      </p>
    );
  }
  return <PricingForm guideId={String(activeGuide.id)} />;
}

function PricingForm({ guideId }: { guideId: string }) {
  const queryClient = useQueryClient();
  const { data: guide } = usePricingGuidesIdDetailHandlerSuspense(guideId);
  const { data: tierList } = useListPricingTierSuspense({
    filters: [{ type: "text", column: "guide_id", operation: "equals", value: guideId }],
    sorts: [{ column: "length_until_ft", direction: "asc" }],
    limit: 100,
  });

  const [serviceType, setServiceType] = useState<ServiceType>(guide.service_type);

  const [tiers, setTiers] = useState<TierDraft[]>(() => {
    if (tierList.items.length === 0) return [emptyTier()];
    return tierList.items.map((t) => ({
      pricing_type: t.pricing_type,
      amount_dollars: t.amount_cents != null ? (t.amount_cents / 100).toFixed(2) : "",
      length_until_ft: t.length_until_ft != null ? String(t.length_until_ft) : "",
    }));
  });

  const updateTier = (idx: number, patch: Partial<TierDraft>) =>
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  const removeTier = (idx: number) =>
    setTiers((prev) => prev.filter((_, i) => i !== idx));

  const addTier = () => setTiers((prev) => [...prev, emptyTier()]);

  const execute = useActionsActionGroupExecuteAction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/onboardings"] });
        queryClient.invalidateQueries({ queryKey: ["/pricing-guides"] });
        queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      },
      onError: (err) => toast.error(getErrorMessage(err, "Could not save pricing")),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tiers.length === 0) {
      toast.error("Add at least one tier");
      return;
    }
    const payload = [];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const cents = Math.round(parseFloat(t.amount_dollars) * 100);
      if (!Number.isFinite(cents) || cents < 0) {
        toast.error(`Tier ${i + 1}: amount must be a positive number`);
        return;
      }
      const untilFt = t.length_until_ft === "" ? null : parseFloat(t.length_until_ft);
      payload.push({
        length_until_ft: untilFt != null && Number.isFinite(untilFt) ? untilFt : null,
        pricing_type: t.pricing_type,
        amount_cents: cents,
      });
    }
    execute.mutate({
      actionGroup: "onboarding_actions",
      data: {
        action: "onboarding_actions__confirm_pricing",
        data: { service_type: serviceType, tiers: payload },
      } as unknown as ActionsActionGroupExecuteActionBody,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guide-service-type">Service type</Label>
        <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
          <SelectTrigger id="guide-service-type">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          You can add pricing for other services later from Settings.
        </p>
      </div>

      <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
        {tiers.map((tier, idx) => {
          const amountLabel = tier.pricing_type === "per_foot" ? "$/ft" : "Amount (USD)";
          return (
            <div
              key={idx}
              className="rounded-lg border p-3 flex flex-col gap-3 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Tier {idx + 1}
                </span>
                {tiers.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeTier(idx)}
                    aria-label="Remove tier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`pricing-type-${idx}`}>Pricing model</Label>
                  <Select
                    value={tier.pricing_type}
                    onValueChange={(v) => updateTier(idx, { pricing_type: v as PricingType })}
                  >
                    <SelectTrigger id={`pricing-type-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat rate</SelectItem>
                      <SelectItem value="per_foot">Per foot</SelectItem>
                      <SelectItem value="by_quote">By quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`amount-${idx}`}>{amountLabel}</Label>
                  <Input
                    id={`amount-${idx}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={tier.amount_dollars}
                    onChange={(e) => updateTier(idx, { amount_dollars: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label htmlFor={`length-until-${idx}`}>Applies up to (ft)</Label>
                  <Input
                    id={`length-until-${idx}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    placeholder="Leave blank for no upper limit"
                    value={tier.length_until_ft}
                    onChange={(e) => updateTier(idx, { length_until_ft: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addTier}>
        + Add tier
      </Button>

      <div className="flex justify-end">
        <Button type="submit" disabled={execute.isPending}>
          {execute.isPending ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}
