import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AddressInput } from "@/openapi/litestarAPI.schemas";

const EMPTY_ADDRESS: AddressInput = {
  line1: "",
  line2: null,
  city: "",
  region: "",
  postal_code: "",
  country: "US",
};

interface Props {
  value: AddressInput | null;
  onChange: (next: AddressInput | null) => void;
}

export function AddressFields({ value, onChange }: Props) {
  const [showing, setShowing] = useState(false);
  const isOpen = Boolean(value) || showing;
  const base = value ?? EMPTY_ADDRESS;

  const commit = (patch: Partial<AddressInput>) => {
    const next = { ...base, ...patch };
    const empty =
      !next.line1 && !next.city && !next.region && !next.postal_code && !next.line2;
    onChange(empty ? null : next);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowing(true)}
      >
        <Plus className="size-4" />
        Add address
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Address</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowing(false);
            if (value) onChange(null);
          }}
        >
          <X className="size-4" />
          Remove
        </Button>
      </div>
      <BlurInput
        value={base.line1}
        placeholder="Street"
        onCommit={(v) => commit({ line1: v })}
      />
      <BlurInput
        value={base.line2 ?? ""}
        placeholder="Apt, suite, etc. (optional)"
        onCommit={(v) => commit({ line2: v || null })}
      />
      <div className="grid grid-cols-2 gap-2">
        <BlurInput
          value={base.city}
          placeholder="City"
          onCommit={(v) => commit({ city: v })}
        />
        <BlurInput
          value={base.region}
          placeholder="State/Region"
          onCommit={(v) => commit({ region: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BlurInput
          value={base.postal_code}
          placeholder="Postal code"
          onCommit={(v) => commit({ postal_code: v })}
        />
        <BlurInput
          value={base.country ?? "US"}
          placeholder="Country"
          onCommit={(v) => commit({ country: v || "US" })}
        />
      </div>
    </div>
  );
}

function BlurInput({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}
