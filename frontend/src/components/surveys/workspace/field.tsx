import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDropTarget } from "@/hooks/use-drop-target";
import type { SurveyFormNodeRef, SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";
import { PhotoActionRow } from "./photo-action-row";
import type { SurveyActions } from "./use-survey-actions";

// ── Node & severity helpers ──────────────────────────────────────────────

export type Tree = SurveyFormNodeRef & { children: Tree[] };

export const DRAG_MEDIA_TYPE = "application/x-sloopquest-media-id";

export function getFieldType(node: SurveyFormNodeRef): string | undefined {
  return (node.config as { type?: string } | null)?.type;
}

export type FindingValue = { severity?: string; summary?: string; type?: string };

export function getFindingValue(node: SurveyFormNodeRef): FindingValue | null {
  return node.value as FindingValue | null;
}

export function isFinding(node: SurveyFormNodeRef): boolean {
  return node.kind === "annotation" && getFindingValue(node)?.type === "finding";
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export type Severity = "info" | "advisory" | "critical";

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  advisory: 1,
  info: 2,
};

export const SEVERITY_DOT: Record<Severity, string> = {
  info: "bg-sky-500",
  advisory: "bg-amber-500",
  critical: "bg-red-600",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  info: "text-sky-700",
  advisory: "text-amber-700",
  critical: "text-red-700",
};

export function asSeverity(value: string | undefined): Severity {
  if (value === "critical" || value === "advisory" || value === "info") return value;
  return "info";
}

// ── Field rendering ──────────────────────────────────────────────────────

type FieldDef = {
  type: string;
  label: string;
  required?: boolean;
  config?: { options?: string[] };
};

function fieldDef(node: SurveyFormNodeRef): FieldDef {
  return (node.config ?? { type: "text", label: node.label }) as FieldDef;
}

export function FieldCard({
  node,
  fieldIndex,
  onSave,
  photoActionRow,
}: {
  node: SurveyFormNodeRef;
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
    <Card className="mb-4 gap-0 px-4 py-4 shadow-none">
      <div className="mb-3 flex items-baseline gap-2.5 border-b border-border pb-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Field {pad2(fieldIndex + 1)}
        </span>
        <span className="text-muted-foreground/50" aria-hidden>
          ·
        </span>
        <span className="font-display text-[16px] font-light leading-none text-foreground">
          {def.label}
          {def.required && <span className="ml-1 text-destructive">*</span>}
        </span>
      </div>
      {renderInput()}
      {photoActionRow && <div className="mt-2">{photoActionRow}</div>}
    </Card>
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

type FieldDeps = {
  surveyId: string;
  actions: SurveyActions;
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  mediaByNode: Map<string, SurveyMediaListItem[]>;
  unassignedMedia: SurveyMediaListItem[];
};

export function FieldOrRepeater({
  node,
  fieldIndex,
  fieldTotal,
  ...deps
}: {
  node: Tree;
  fieldIndex: number;
  fieldTotal: number;
} & FieldDeps) {
  const { actions } = deps;
  const isRepeater = getFieldType(node) === "repeater";

  if (!isRepeater) {
    return (
      <FieldWithExtras
        node={node}
        fieldIndex={fieldIndex}
        fieldTotal={fieldTotal}
        {...deps}
      />
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{node.label}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.addRepeaterInstance(node.id)}
        >
          + Add another
        </Button>
      </div>
      {node.children
        .filter((c) => c.kind === "repeater_instance")
        .map((instance) => (
          <RepeaterInstance key={instance.id} instance={instance} {...deps} />
        ))}
    </div>
  );
}

function RepeaterInstance({
  instance,
  ...deps
}: { instance: Tree } & FieldDeps) {
  const { actions } = deps;
  const fields = instance.children.filter((c) => c.kind === "field");

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{instance.label}</div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={() => actions.deleteNode(instance.id)}
        >
          Remove
        </Button>
      </div>
      {fields.map((child, idx) => (
        <FieldWithExtras
          key={child.id}
          node={child}
          fieldIndex={idx}
          fieldTotal={fields.length}
          {...deps}
        />
      ))}
    </div>
  );
}

function FieldWithExtras({
  node,
  fieldIndex,
  fieldTotal,
  surveyId,
  actions,
  findingsByParent,
  mediaByNode,
  unassignedMedia,
}: {
  node: SurveyFormNodeRef;
  fieldIndex: number;
  fieldTotal: number;
} & FieldDeps) {
  const drop = useDropTarget(DRAG_MEDIA_TYPE, (mediaId) => actions.assignMedia(mediaId, node.id));
  const findings = findingsByParent.get(node.id) ?? [];
  const isPhoto = getFieldType(node) === "photo";

  return (
    <div
      className={`space-y-2 rounded-2xl transition-shadow ${drop.isOver ? "ring-2 ring-primary" : ""}`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <FieldCard
        node={node}
        fieldIndex={fieldIndex}
        fieldTotal={fieldTotal}
        onSave={(value) => actions.saveField(node, value)}
        photoActionRow={
          isPhoto ? (
            <PhotoActionRow
              nodeId={node.id}
              surveyId={surveyId}
              actions={actions}
              mediaByNode={mediaByNode}
              unassignedMedia={unassignedMedia}
            />
          ) : null
        }
      />
      {findings.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-1">
          {findings.map((f) => {
            const v = getFindingValue(f);
            const sev = asSeverity(v?.severity);
            return (
              <Badge
                key={f.id}
                variant="outline"
                className={`gap-1 bg-background ${SEVERITY_TEXT[sev]}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev]}`} />
                {v?.summary ?? f.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
