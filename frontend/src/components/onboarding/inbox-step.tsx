import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionsActionGroupExecuteAction } from "@/openapi/actions/actions";
import { useCheckInboxLocalPartAvailable } from "@/openapi/user/user";
import { getOnboardingConfig } from "@/openapi/onboarding/onboarding";
import type { ActionsActionGroupExecuteActionBody } from "@/openapi/litestarAPI.schemas";
import { useQuery } from "@tanstack/react-query";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

export function InboxStep() {
  const queryClient = useQueryClient();
  const [localPart, setLocalPart] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(localPart.trim()), 300);
    return () => clearTimeout(t);
  }, [localPart]);

  const { data: config } = useQuery({
    queryKey: ["/onboarding/config"],
    queryFn: ({ signal }) => getOnboardingConfig(signal),
    staleTime: Infinity,
  });

  const { data: availability, isFetching } = useCheckInboxLocalPartAvailable(
    { local_part: debounced },
    { query: { enabled: debounced.length > 0 } },
  );

  const execute = useActionsActionGroupExecuteAction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/onboardings"] });
        queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      },
      onError: (err) => toast.error(getErrorMessage(err, "Could not claim inbox")),
    },
  });

  const canSubmit = useMemo(() => {
    return Boolean(availability?.available) && debounced === localPart.trim() && !execute.isPending;
  }, [availability, debounced, localPart, execute.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    execute.mutate({
      actionGroup: "onboarding_actions",
      data: {
        action: "onboarding_actions__claim_inbox",
        data: { local_part: localPart.trim() },
      } as unknown as ActionsActionGroupExecuteActionBody,
    });
  };

  const status = renderStatus(debounced, isFetching, availability);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="inbox-local-part">Inbox name</Label>
        <div className="flex items-center gap-2">
          <Input
            id="inbox-local-part"
            autoFocus
            placeholder="phil"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            @{config?.inbox_domain ?? "…"}
          </span>
        </div>
        {status && <p className={status.tone}>{status.message}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        Claiming is one-time and permanent — choose carefully.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {execute.isPending ? "Claiming…" : "Claim inbox"}
        </Button>
      </div>
    </form>
  );
}

function renderStatus(
  value: string,
  isFetching: boolean,
  availability: { available: boolean; canonical: string; reason?: string | null } | undefined,
): { message: string; tone: string } | null {
  if (!value) return null;
  if (isFetching) return { message: "Checking…", tone: "text-sm text-muted-foreground" };
  if (!availability) return null;
  if (availability.available) {
    return {
      message: `${availability.canonical} is available`,
      tone: "text-sm text-emerald-600",
    };
  }
  const reasonMessage =
    availability.reason === "reserved"
      ? "That name is reserved"
      : availability.reason === "taken"
        ? "That name is already taken"
        : "That name is not valid";
  return { message: reasonMessage, tone: "text-sm text-destructive" };
}
