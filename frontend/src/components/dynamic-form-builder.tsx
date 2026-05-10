import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldTypeEnum } from "@/lib/form-dsl/types";
import type { FormDefinition, FormField, FormSection } from "@/lib/form-dsl/types";
import { X, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  value: FormDefinition;
  onChange: (v: FormDefinition) => void;
}

function newId(prefix: string) {
  return prefix + crypto.randomUUID().replace(/-/g, "");
}

function newField(): FormField {
  return { id: newId("f"), type: FieldTypeEnum.text, label: "", required: false, options: [] };
}

function newSection(): FormSection {
  return { id: newId("s"), title: "", fields: [] };
}

export function DynamicFormBuilder({ value, onChange }: Props) {
  const sections = value.sections;

  function updateSections(next: FormSection[]) {
    onChange({ ...value, sections: next });
  }

  function addSection() {
    updateSections([...sections, newSection()]);
  }

  function deleteSection(si: number) {
    updateSections(sections.filter((_, i) => i !== si));
  }

  function moveSection(si: number, dir: -1 | 1) {
    const next = [...sections];
    const target = si + dir;
    if (target < 0 || target >= next.length) return;
    [next[si], next[target]] = [next[target], next[si]];
    updateSections(next);
  }

  function updateSection(si: number, patch: Partial<FormSection>) {
    updateSections(sections.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  }

  function addField(si: number) {
    const section = sections[si];
    updateSection(si, { fields: [...section.fields, newField()] });
  }

  function deleteField(si: number, fi: number) {
    updateSection(si, { fields: sections[si].fields.filter((_, i) => i !== fi) });
  }

  function updateField(si: number, fi: number, patch: Partial<FormField>) {
    const fields = sections[si].fields.map((f, i) => (i === fi ? { ...f, ...patch } : f));
    updateSection(si, { fields });
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={si}
          total={sections.length}
          onMove={(dir) => moveSection(si, dir)}
          onDelete={() => deleteSection(si)}
          onUpdateTitle={(title) => updateSection(si, { title })}
          onAddField={() => addField(si)}
          onDeleteField={(fi) => deleteField(si, fi)}
          onUpdateField={(fi, patch) => updateField(si, fi, patch)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addSection} className="w-full">
        <Plus className="mr-1 h-4 w-4" /> Add Section
      </Button>
    </div>
  );
}

interface SectionEditorProps {
  section: FormSection;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onUpdateTitle: (t: string) => void;
  onAddField: () => void;
  onDeleteField: (fi: number) => void;
  onUpdateField: (fi: number, patch: Partial<FormField>) => void;
}

function SectionEditor({
  section,
  index,
  total,
  onMove,
  onDelete,
  onUpdateTitle,
  onAddField,
  onDeleteField,
  onUpdateField,
}: SectionEditorProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={section.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Section title"
          className="flex-1"
        />
        <Button type="button" variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === total - 1}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 pl-2">
        {section.fields.map((field, fi) => (
          <FieldEditor
            key={field.id}
            field={field}
            onChange={(patch) => onUpdateField(fi, patch)}
            onDelete={() => onDeleteField(fi)}
          />
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={onAddField} className="text-muted-foreground">
          <Plus className="mr-1 h-3 w-3" /> Add Field
        </Button>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onDelete: () => void;
}

function FieldEditor({ field, onChange, onDelete }: FieldEditorProps) {
  const [newOption, setNewOption] = useState("");

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    onChange({ options: [...(field.options ?? []), trimmed] });
    setNewOption("");
  }

  function removeOption(opt: string) {
    onChange({ options: (field.options ?? []).filter((o) => o !== opt) });
  }

  return (
    <div className="rounded border border-border/50 bg-background p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label"
          className="flex-1"
        />
        <Select value={field.type} onValueChange={(v) => onChange({ type: v as typeof field.type, options: [] })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(FieldTypeEnum).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Checkbox
            id={`req-${field.id}`}
            checked={field.required ?? false}
            onCheckedChange={(v) => onChange({ required: !!v })}
          />
          <Label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground whitespace-nowrap">Required</Label>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {field.type === FieldTypeEnum.select && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {(field.options ?? []).map((opt) => (
              <span key={opt} className="flex items-center gap-0.5 rounded bg-muted px-2 py-0.5 text-xs">
                {opt}
                <button type="button" onClick={() => removeOption(opt)} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
            placeholder="Add option, press Enter"
            className="h-7 text-xs"
          />
        </div>
      )}

      {field.type === FieldTypeEnum.number && (
        <Input
          value={field.unit ?? ""}
          onChange={(e) => onChange({ unit: e.target.value || undefined })}
          placeholder="Unit (e.g. ft, lbs)"
          className="h-7 text-xs w-40"
        />
      )}
    </div>
  );
}
