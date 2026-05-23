import { Controller, FormProvider, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  FieldTypeEnum,
  buildRules,
  isFieldVisible,
  isSectionVisible,
  useDynamicForm,
} from "@/lib/form-dsl";
import type { FormField } from "@/lib/form-dsl/types";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import { useSurveyTemplatesIdDetailHandlerSuspense } from "@/openapi/survey-templates/survey-templates";
import { PhotoField } from "@/components/surveys/photo-field";

interface Props {
  surveyId: string;
  templateId: string;
  existingResponse: Record<string, unknown> | null;
}

export function DynamicFormRenderer({ surveyId, templateId, existingResponse }: Props) {
  const { data: template } = useSurveyTemplatesIdDetailHandlerSuspense(templateId);
  const definition = template.definition;

  const methods = useDynamicForm(definition, existingResponse);
  const { mutate, isPending } = useActionsActionGroupObjectIdExecuteObjectAction();

  function onSubmit(values: Record<string, unknown>) {
    mutate({
      actionGroup: "survey_actions",
      objectId: surveyId,
      data: { action: "survey_actions__save_response", data: { response: values } },
    });
  }

  const sections = definition.sections ?? [];

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        {sections.map((section) => (
          <ConditionalSection key={section.id} condition={section.condition ?? null}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(section.fields ?? []).map((field) => (
                  <ConditionalField key={field.id} field={field} surveyId={surveyId} />
                ))}
                {(section.subsections ?? []).map((sub) => (
                  <div key={sub.id} className="space-y-3">
                    {sub.title && (
                      <div className="text-sm font-medium text-muted-foreground">{sub.title}</div>
                    )}
                    {(sub.fields ?? []).map((field) => (
                      <ConditionalField key={field.id} field={field} surveyId={surveyId} />
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </ConditionalSection>
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Inspection Data"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function ConditionalSection({
  condition,
  children,
}: {
  condition: { field: string; equals: unknown } | null;
  children: React.ReactNode;
}) {
  const values = useWatch();
  if (!isSectionVisible({ id: "", title: "", condition } as never, values as never)) return null;
  return <>{children}</>;
}

function ConditionalField({ field, surveyId }: { field: FormField; surveyId: string }) {
  const values = useWatch();
  if (!isFieldVisible(field, values as never)) return null;
  return <DynamicField field={field} surveyId={surveyId} />;
}

function DynamicField({ field, surveyId }: { field: FormField; surveyId: string }) {
  const rules = buildRules(field);
  const htmlId = `field-${field.id}`;
  const options = (field.config?.options as string[] | undefined) ?? [];
  const unit = field.config?.unit as string | undefined;

  if (field.type === FieldTypeEnum.photo) {
    return (
      <PhotoField
        surveyId={surveyId}
        fieldId={field.id}
        label={field.label}
        required={field.required ?? false}
      />
    );
  }

  if (field.type === FieldTypeEnum.repeater) {
    return <RepeaterField field={field} surveyId={surveyId} />;
  }

  if (field.type === FieldTypeEnum.static_text) {
    return <p className="text-sm text-muted-foreground">{field.label}</p>;
  }

  return (
    <Controller
      name={field.id}
      rules={rules}
      render={({ field: f, fieldState }) => (
        <div className="space-y-1">
          {field.type !== FieldTypeEnum.boolean && (
            <Label htmlFor={htmlId}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
          )}

          {field.type === FieldTypeEnum.text && (
            <Input id={htmlId} value={(f.value as string) ?? ""} onChange={f.onChange} />
          )}

          {field.type === FieldTypeEnum.longtext && (
            <Textarea id={htmlId} value={(f.value as string) ?? ""} onChange={f.onChange} rows={3} />
          )}

          {(field.type === FieldTypeEnum.number ||
            field.type === FieldTypeEnum.currency) && (
            <div className="flex items-center gap-2">
              {field.type === FieldTypeEnum.currency && (
                <span className="text-sm text-muted-foreground">$</span>
              )}
              <Input
                id={htmlId}
                type="number"
                value={(f.value as number | null) ?? ""}
                onChange={(e) =>
                  f.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
                }
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                className="flex-1"
              />
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          )}

          {field.type === FieldTypeEnum.date && (
            <Input
              id={htmlId}
              type="date"
              value={(f.value as string) ?? ""}
              onChange={(e) => f.onChange(e.target.value || null)}
            />
          )}

          {field.type === FieldTypeEnum.boolean && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={htmlId}
                checked={!!f.value}
                onCheckedChange={(v) => f.onChange(!!v)}
              />
              <Label htmlFor={htmlId} className="font-normal">
                {field.label}
                {field.required ? " *" : ""}
              </Label>
            </div>
          )}

          {field.type === FieldTypeEnum.select && (
            <Select value={(f.value as string) ?? ""} onValueChange={f.onChange}>
              <SelectTrigger id={htmlId}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === FieldTypeEnum.segmented && (
            <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
              {options.map((opt) => {
                const selected = f.value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => f.onChange(selected ? null : opt)}
                    className={
                      "rounded px-3 py-1 text-sm transition-colors " +
                      (selected
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {fieldState.error && (
            <p className="text-destructive text-sm">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}

function RepeaterField({ field, surveyId }: { field: FormField; surveyId: string }) {
  const { setValue } = useFormContext();
  const value = (useWatch({ name: field.id }) as Record<string, unknown>[] | undefined) ?? [];
  const childFields = field.fields ?? [];
  const labelField = field.instance_label_field ?? null;

  function add() {
    setValue(field.id, [...value, {}], { shouldDirty: true });
  }
  function remove(idx: number) {
    setValue(
      field.id,
      value.filter((_, i) => i !== idx),
      { shouldDirty: true },
    );
  }
  function patchItem(idx: number, fid: string, v: unknown) {
    const next = value.map((item, i) => (i === idx ? { ...item, [fid]: v } : item));
    setValue(field.id, next, { shouldDirty: true });
  }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      <div className="space-y-2">
        {value.map((item, idx) => {
          const heading =
            (labelField && (item[labelField] as string | undefined)) || `Item ${idx + 1}`;
          return (
            <div key={idx} className="rounded border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{heading}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                  Remove
                </Button>
              </div>
              {childFields.map((cf) => (
                <RepeaterChild
                  key={cf.id}
                  field={cf}
                  surveyId={surveyId}
                  value={item[cf.id]}
                  onChange={(v) => patchItem(idx, cf.id, v)}
                />
              ))}
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add
      </Button>
    </div>
  );
}

function RepeaterChild({
  field,
  value,
  onChange,
}: {
  field: FormField;
  surveyId: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const htmlId = `repeater-${field.id}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlId} className="text-xs text-muted-foreground">
        {field.label}
      </Label>
      {field.type === FieldTypeEnum.number || field.type === FieldTypeEnum.currency ? (
        <Input
          id={htmlId}
          type="number"
          value={(value as number | null) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
        />
      ) : (
        <Input
          id={htmlId}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
