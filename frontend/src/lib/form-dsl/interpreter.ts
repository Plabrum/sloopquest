import { useForm } from "react-hook-form";
import type { RegisterOptions, DefaultValues } from "react-hook-form";
import { FieldTypeEnum } from "@/lib/form-dsl/types";
import type { FormDefinition, FormField } from "@/lib/form-dsl/types";

export type FormValues = Record<string, string | number | boolean | null>;

export function buildDefaultValues(
  definition: FormDefinition,
  existing: Record<string, unknown> | null,
): DefaultValues<FormValues> {
  const defaults: FormValues = {};
  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (existing && field.id in existing) {
        defaults[field.id] = existing[field.id] as string | number | boolean | null;
      } else {
        defaults[field.id] = field.type === FieldTypeEnum.checkbox ? false : null;
      }
    }
  }
  return defaults as DefaultValues<FormValues>;
}

export function buildRules(field: FormField): RegisterOptions {
  const rules: RegisterOptions = {};
  if (field.required) {
    rules.required = "This field is required";
  }
  if (field.type === FieldTypeEnum.select && field.options?.length) {
    const allowed = new Set(field.options);
    rules.validate = (v: unknown) =>
      v == null || v === "" || allowed.has(String(v)) || `Must be one of: ${field.options!.join(", ")}`;
  }
  return rules;
}

export function useDynamicForm(
  definition: FormDefinition,
  existing: Record<string, unknown> | null,
) {
  const defaultValues = buildDefaultValues(definition, existing);
  return useForm<FormValues>({ defaultValues, mode: "onSubmit" });
}
