import { Controller, FormProvider } from "react-hook-form";
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
import { FieldTypeEnum, buildRules, useDynamicForm } from "@/lib/form-dsl";
import type { FormField } from "@/lib/form-dsl/types";
import { useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";
import { useSurveyTemplatesIdDetailHandlerSuspense } from "@/openapi/survey-templates/survey-templates";

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

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        {definition.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field) => (
                <DynamicField key={field.id} field={field} />
              ))}
            </CardContent>
          </Card>
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

function DynamicField({ field }: { field: FormField }) {
  const rules = buildRules(field);
  const htmlId = `field-${field.id}`;

  return (
    <Controller
      name={field.id}
      rules={rules}
      render={({ field: f, fieldState }) => (
        <div className="space-y-1">
          {field.type !== FieldTypeEnum.checkbox && (
            <Label htmlFor={htmlId}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
          )}

          {field.type === FieldTypeEnum.text && (
            <Input id={htmlId} value={(f.value as string) ?? ""} onChange={f.onChange} />
          )}

          {field.type === FieldTypeEnum.textarea && (
            <Textarea id={htmlId} value={(f.value as string) ?? ""} onChange={f.onChange} rows={3} />
          )}

          {field.type === FieldTypeEnum.number && (
            <div className="flex items-center gap-2">
              <Input
                id={htmlId}
                type="number"
                value={(f.value as number) ?? ""}
                onChange={(e) => f.onChange(e.target.valueAsNumber)}
                className="flex-1"
              />
              {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
            </div>
          )}

          {field.type === FieldTypeEnum.checkbox && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={htmlId}
                checked={!!f.value}
                onCheckedChange={f.onChange}
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
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {fieldState.error && (
            <p className="text-destructive text-sm">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
