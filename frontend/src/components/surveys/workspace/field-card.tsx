import { type ReactNode, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";

type FieldDef = {
  type: string;
  label: string;
  required?: boolean;
  config?: { options?: string[] };
};

function fieldDef(node: FormNodeRef): FieldDef {
  return (node.config ?? { type: "text", label: node.label }) as FieldDef;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function FieldCard({
  node,
  fieldIndex,
  fieldTotal,
  onSave,
  photoActionRow,
}: {
  node: FormNodeRef;
  fieldIndex: number;
  fieldTotal: number;
  onSave: (value: unknown) => Promise<void> | void;
  photoActionRow?: ReactNode;
}) {
  const def = fieldDef(node);
  const [draft, setDraft] = useState<unknown>(node.value ?? "");
  const lastSaved = useRef<unknown>(node.value);

  useEffect(() => {
    setDraft(node.value ?? "");
    lastSaved.current = node.value;
  }, [node.value]);

  async function flush(value: unknown) {
    if (Object.is(value, lastSaved.current)) return;
    await onSave(value);
    lastSaved.current = value;
  }

  const options = def.config?.options ?? [];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Field {pad2(fieldIndex + 1)}
          {fieldTotal > 0 ? ` of ${pad2(fieldTotal)}` : ""}
        </span>
        <span className="text-sm font-medium">
          {def.label}
          {def.required && <span className="ml-1 text-red-500">*</span>}
        </span>
      </div>
      {renderInput()}
      {photoActionRow && <div className="mt-2">{photoActionRow}</div>}
    </div>
  );

  function renderInput() {
    switch (def.type) {
      case "longtext":
        return (
          <Textarea
            value={(draft as string) ?? ""}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => flush(draft || null)}
            rows={4}
          />
        );

      case "number":
      case "currency":
        return (
          <Input
            type="number"
            value={(draft as number | string) ?? ""}
            onChange={(e) => setDraft(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => flush(draft === "" ? null : draft)}
          />
        );

      case "boolean":
        return (
          <Checkbox
            checked={Boolean(draft)}
            onCheckedChange={(checked) => {
              const next = Boolean(checked);
              setDraft(next);
              flush(next);
            }}
          />
        );

      case "select":
        return (
          <Select
            value={(draft as string) ?? ""}
            onValueChange={(v) => {
              setDraft(v);
              flush(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "segmented":
        return (
          <div className="flex gap-2">
            {options.map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={draft === opt ? "default" : "outline"}
                onClick={() => {
                  setDraft(opt);
                  flush(opt);
                }}
              >
                {opt}
              </Button>
            ))}
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={(draft as string) ?? ""}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => flush(draft || null)}
          />
        );

      case "static_text":
        return <p className="text-sm text-muted-foreground">{def.label}</p>;

      case "photo":
        // Photo flows are M6 — surface the count for now.
        return (
          <p className="text-xs text-muted-foreground">
            {Array.isArray(draft) ? `${draft.length} photo(s)` : "No photos yet"}
          </p>
        );

      default:
        return (
          <Input
            type="text"
            value={(draft as string) ?? ""}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => flush(draft || null)}
          />
        );
    }
  }
}
