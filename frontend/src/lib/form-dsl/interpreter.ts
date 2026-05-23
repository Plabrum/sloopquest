import { useForm } from "react-hook-form";
import type { RegisterOptions, DefaultValues } from "react-hook-form";
import { FieldTypeEnum } from "@/lib/form-dsl/types";
import type { FormDefinition, FormField, FormSection } from "@/lib/form-dsl/types";

export type FormValues = Record<string, unknown>;

function defaultForField(field: FormField): unknown {
  if (field.type === FieldTypeEnum.boolean) return false;
  if (field.type === FieldTypeEnum.repeater) return [];
  return null;
}

function setDefault(
  defaults: FormValues,
  field: FormField,
  existing: Record<string, unknown> | null,
) {
  if (field.type === FieldTypeEnum.photo) {
    // PhotoField manages its own state via SurveyMedia; don't register a form value.
    return;
  }
  if (existing && field.id in existing) {
    defaults[field.id] = existing[field.id];
  } else {
    defaults[field.id] = defaultForField(field);
  }
}

export function iterateFields(definition: FormDefinition): FormField[] {
  const out: FormField[] = [];
  for (const section of definition.sections ?? []) {
    for (const field of section.fields ?? []) out.push(field);
    for (const sub of section.subsections ?? []) {
      for (const field of sub.fields ?? []) out.push(field);
    }
  }
  return out;
}

export function buildDefaultValues(
  definition: FormDefinition,
  existing: Record<string, unknown> | null,
): DefaultValues<FormValues> {
  const defaults: FormValues = {};
  for (const field of iterateFields(definition)) {
    setDefault(defaults, field, existing);
  }
  return defaults as DefaultValues<FormValues>;
}

export function buildRules(field: FormField): RegisterOptions {
  const rules: RegisterOptions = {};
  if (field.required) {
    rules.required = "This field is required";
  }
  const options = (field.config?.options as string[] | undefined) ?? undefined;
  if (
    (field.type === FieldTypeEnum.select ||
      field.type === FieldTypeEnum.segmented) &&
    options?.length
  ) {
    const allowed = new Set(options);
    rules.validate = (v: unknown) =>
      v == null || v === "" || allowed.has(String(v)) || `Must be one of: ${options.join(", ")}`;
  }
  return rules;
}

export function isSectionVisible(section: FormSection, values: FormValues): boolean {
  if (!section.condition) return true;
  return values[section.condition.field] === section.condition.equals;
}

export function isFieldVisible(field: FormField, values: FormValues): boolean {
  if (!field.condition) return true;
  return values[field.condition.field] === field.condition.equals;
}

export function useDynamicForm(
  definition: FormDefinition,
  existing: Record<string, unknown> | null,
) {
  const defaultValues = buildDefaultValues(definition, existing);
  return useForm<FormValues>({ defaultValues, mode: "onSubmit" });
}
