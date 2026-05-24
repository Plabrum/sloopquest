import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import type {
  FieldDef,
  Section,
  Subsection,
  SurveyTemplateDetail,
  TemplateDefinition,
} from "@/openapi/litestarAPI.schemas";

const FIELD_TYPES = [
  "text",
  "longtext",
  "select",
  "multiselect",
  "segmented",
  "number",
  "currency",
  "date",
  "boolean",
  "photo",
  "static_text",
  "signature",
] as const;

type EditableTemplate = TemplateDefinition & {
  sections: Section[];
};

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDefinition(def: TemplateDefinition): EditableTemplate {
  return {
    version: def.version ?? 1,
    sections: def.sections ?? [],
  };
}

export function TemplateEditor({ template }: { template: SurveyTemplateDetail }) {
  const [draft, setDraft] = useState<EditableTemplate>(() => normalizeDefinition(template.definition));
  const [rawJson, setRawJson] = useState(() => JSON.stringify(template.definition, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);
  const execute = useActionsActionGroupObjectIdExecuteObjectAction();
  const queryClient = useQueryClient();

  async function save(next: EditableTemplate) {
    await execute.mutateAsync({
      actionGroup: "survey_template_actions",
      objectId: template.id,
      data: {
        action: "survey_template_actions__update",
        data: {
          name: template.name,
          tags: template.tags,
          definition: next,
        },
      } as never,
    });
    await queryClient.invalidateQueries({
      predicate: (q) =>
        String(q.queryKey[0] ?? "").startsWith(`/survey-templates/${template.id}`),
    });
  }

  function update(next: EditableTemplate) {
    setDraft(next);
    setRawJson(JSON.stringify(next, null, 2));
  }

  function addSection() {
    const next = clone(draft);
    next.sections.push({
      id: randomId("sec"),
      title: "New section",
      fields: [],
      subsections: [],
    });
    update(next);
  }

  function removeSection(idx: number) {
    const next = clone(draft);
    next.sections.splice(idx, 1);
    update(next);
  }

  function updateSection(idx: number, mutator: (s: Section) => void) {
    const next = clone(draft);
    mutator(next.sections[idx]);
    update(next);
  }

  function applyRaw() {
    try {
      const parsed = JSON.parse(rawJson) as TemplateDefinition;
      setRawError(null);
      setDraft(normalizeDefinition(parsed));
    } catch (err) {
      setRawError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sections render in order; surveyors can override per-survey via the workspace.
        </p>
        <Button
          onClick={() => save(draft)}
          disabled={execute.isPending}
        >
          {execute.isPending ? "Saving…" : "Save template"}
        </Button>
      </div>

      <Tabs defaultValue="structured">
        <TabsList>
          <TabsTrigger value="structured">Structured</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="structured" className="space-y-3">
          {draft.sections.length === 0 && (
            <p className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
              No sections yet.
            </p>
          )}
          {draft.sections.map((section, idx) => (
            <SectionEditor
              key={section.id}
              section={section}
              onChange={(mutator) => updateSection(idx, mutator)}
              onRemove={() => removeSection(idx)}
            />
          ))}
          <Button variant="outline" onClick={addSection}>+ Add section</Button>
        </TabsContent>

        <TabsContent value="raw" className="space-y-2">
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={24}
            className="font-mono text-xs"
          />
          {rawError && <p className="text-sm text-red-600">{rawError}</p>}
          <Button onClick={applyRaw} variant="outline">Apply JSON to editor</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: Section;
  onChange: (mutator: (s: Section) => void) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={section.title}
          onChange={(e) => onChange((s) => { s.title = e.target.value; })}
          className="font-medium"
        />
        <Button variant="ghost" size="sm" onClick={onRemove}>Remove</Button>
      </div>
      <div className="space-y-2 pl-4">
        <div className="space-y-2">
          {(section.fields ?? []).map((field, idx) => (
            <FieldEditor
              key={field.id}
              field={field}
              onChange={(mutator) =>
                onChange((s) => {
                  if (!s.fields) s.fields = [];
                  mutator(s.fields[idx]);
                })
              }
              onRemove={() =>
                onChange((s) => {
                  s.fields?.splice(idx, 1);
                })
              }
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange((s) => {
                if (!s.fields) s.fields = [];
                s.fields.push({
                  id: randomId("fld"),
                  label: "New field",
                  type: "text",
                });
              })
            }
          >
            + Add field
          </Button>
        </div>
        {(section.subsections ?? []).map((sub, idx) => (
          <SubsectionEditor
            key={sub.id}
            subsection={sub}
            onChange={(mutator) =>
              onChange((s) => {
                if (!s.subsections) s.subsections = [];
                mutator(s.subsections[idx]);
              })
            }
            onRemove={() =>
              onChange((s) => {
                s.subsections?.splice(idx, 1);
              })
            }
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange((s) => {
              if (!s.subsections) s.subsections = [];
              s.subsections.push({
                id: randomId("sub"),
                title: "New subsection",
                fields: [],
              });
            })
          }
        >
          + Add subsection
        </Button>
      </div>
    </div>
  );
}

function SubsectionEditor({
  subsection,
  onChange,
  onRemove,
}: {
  subsection: Subsection;
  onChange: (mutator: (s: Subsection) => void) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={subsection.title}
          onChange={(e) => onChange((s) => { s.title = e.target.value; })}
        />
        <Button variant="ghost" size="sm" onClick={onRemove}>Remove</Button>
      </div>
      <div className="space-y-2 pl-3">
        {(subsection.fields ?? []).map((field, idx) => (
          <FieldEditor
            key={field.id}
            field={field}
            onChange={(mutator) =>
              onChange((s) => {
                if (!s.fields) s.fields = [];
                mutator(s.fields[idx]);
              })
            }
            onRemove={() =>
              onChange((s) => {
                s.fields?.splice(idx, 1);
              })
            }
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange((s) => {
              if (!s.fields) s.fields = [];
              s.fields.push({
                id: randomId("fld"),
                label: "New field",
                type: "text",
              });
            })
          }
        >
          + Add field
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: FieldDef;
  onChange: (mutator: (f: FieldDef) => void) => void;
  onRemove: () => void;
}) {
  const optionsArr =
    Array.isArray((field.config as { options?: string[] } | undefined)?.options)
      ? ((field.config as { options?: string[] }).options as string[])
      : [];
  const showOptions = field.type === "select" || field.type === "multiselect" || field.type === "segmented";

  return (
    <div className="rounded-lg border bg-white p-2 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          onChange={(e) => onChange((f) => { f.label = e.target.value; })}
        />
        <Select
          value={field.type as string}
          onValueChange={(v) =>
            onChange((f) => {
              f.type = v as FieldDef["type"];
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onRemove}>×</Button>
      </div>
      <div className="flex items-center gap-3 pl-1 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onChange((f) => { f.required = e.target.checked; })}
          />
          Required
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={field.allow_finding ?? true}
            onChange={(e) => onChange((f) => { f.allow_finding = e.target.checked; })}
          />
          Allow finding
        </label>
      </div>
      {showOptions && (
        <div className="space-y-1 pl-1">
          <Label className="text-xs">Options (comma-separated)</Label>
          <Input
            value={optionsArr.join(", ")}
            onChange={(e) =>
              onChange((f) => {
                if (!f.config) f.config = {};
                (f.config as Record<string, unknown>).options = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
              })
            }
          />
        </div>
      )}
    </div>
  );
}
