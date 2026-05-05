/**
 * Action form codegen — reads OpenAPI schema + action metadata
 * and generates typed form components + action registry for each action.
 *
 * Run: npx tsx scripts/generate-forms.ts
 * Triggered automatically after Orval via the "codegen" npm script.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OPENAPI_URL =
  process.env.OPENAPI_URL ?? "http://localhost:8000/schema/openapi.json";
const ACTION_METADATA_URL =
  process.env.ACTION_METADATA_URL ??
  "http://localhost:8000/schema/action-metadata";
const OUTPUT_DIR = join(import.meta.dirname, "../src/openapi/actions");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenAPISchema {
  components: { schemas: Record<string, SchemaObject> };
}

interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, RefOrSchema>;
  required?: string[];
  items?: RefOrSchema;
  enum?: string[];
  oneOf?: RefOrSchema[];
  $ref?: string;
  title?: string;
  description?: string;
  const?: string;
}

type RefOrSchema = SchemaObject & { $ref?: string };

interface ActionFieldMeta {
  type: string; // string, boolean, number, date, datetime, enum, id
  required: boolean;
  order: number;
  label?: string;
  placeholder?: string;
  is_id_field?: boolean;
}

interface ActionMeta {
  schema_name?: string;
  has_form: boolean;
  label: string;
  is_hidden: boolean;
  fields?: Record<string, ActionFieldMeta>;
}

type ActionMetadata = Record<string, ActionMeta>;

interface FormFieldInfo {
  name: string;
  component: string; // FormString, FormEmail, FormNumber, FormText, FormSelect, FormDatetime, FormCheckbox
  label: string;
  required: boolean;
  placeholder?: string;
  enumRef?: string; // TypeScript const name for enum values
  extraProps?: string; // additional JSX props
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRef(spec: OpenAPISchema, ref: string): SchemaObject {
  const name = ref.split("/").pop()!;
  return spec.components.schemas[name];
}

function refName(ref: string): string {
  return ref.split("/").pop()!;
}

function humanizeLabel(key: string): string {
  if (key === "dob") return "Date of Birth";
  if (key === "is_qmb") return "QMB Status";
  return key
    .replace(/_id$/, "")
    .replace(/_at$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Unwrap oneOf with null (nullable pattern) to get the real schema/ref.
 */
function unwrapNullable(prop: RefOrSchema): RefOrSchema {
  if (prop.oneOf) {
    const nonNull = prop.oneOf.filter((s) => s.type !== "null");
    if (nonNull.length === 1) return nonNull[0];
  }
  return prop;
}

/**
 * Infer the form field component from OpenAPI property + action metadata.
 */
function inferFormField(
  key: string,
  prop: RefOrSchema,
  spec: OpenAPISchema,
  fieldMeta: ActionFieldMeta | undefined,
  isRequired: boolean,
): FormFieldInfo | null {
  // Skip ID fields
  if (fieldMeta?.is_id_field) return null;

  const schema = unwrapNullable(prop);
  const label = fieldMeta?.label ?? humanizeLabel(key);
  const placeholder = fieldMeta?.placeholder;
  const required = isRequired;

  // Enum: $ref to a schema with enum values
  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    if (resolved.enum) {
      return {
        name: key,
        component: "FormSelect",
        label,
        required,
        placeholder,
        enumRef: refName(schema.$ref),
      };
    }
  }

  // Email (by field name)
  if (key === "email" || key.endsWith("_email")) {
    return { name: key, component: "FormEmail", label, required, placeholder };
  }

  // Phone (by field name)
  if (key === "phone" || key.endsWith("_phone")) {
    return {
      name: key,
      component: "FormString",
      label,
      required,
      placeholder,
      extraProps: 'type="tel"',
    };
  }

  // Date (by metadata type, format, or name)
  if (
    fieldMeta?.type === "date" ||
    schema.format === "date" ||
    key.endsWith("_date") ||
    key === "dob"
  ) {
    return {
      name: key,
      component: "FormDatetime",
      label,
      required,
      placeholder,
    };
  }

  // Datetime
  if (
    fieldMeta?.type === "datetime" ||
    schema.format === "date-time" ||
    key.endsWith("_at")
  ) {
    return {
      name: key,
      component: "FormDatetime",
      label,
      required,
      placeholder,
      extraProps: "includeTime",
    };
  }

  // Boolean
  if (schema.type === "boolean" || fieldMeta?.type === "boolean") {
    return {
      name: key,
      component: "FormCheckbox",
      label,
      required,
      placeholder,
    };
  }

  // Number
  if (
    schema.type === "integer" ||
    schema.type === "number" ||
    fieldMeta?.type === "number"
  ) {
    return {
      name: key,
      component: "FormNumber",
      label,
      required,
      placeholder,
    };
  }

  // Textarea (long text fields by name heuristic)
  if (/notes|description|background|diagnosis|reason/.test(key)) {
    return { name: key, component: "FormText", label, required, placeholder };
  }

  // Default: string
  return { name: key, component: "FormString", label, required, placeholder };
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function pascalCase(str: string): string {
  return str
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function actionKeyToFormName(actionKey: string): string {
  // "patient_actions__add_contact" → "PatientActionsAddContactForm"
  return pascalCase(actionKey) + "Form";
}

function generateFormComponent(
  actionKey: string,
  schemaName: string,
  fields: FormFieldInfo[],
): string {
  const formName = actionKeyToFormName(actionKey);
  const varPrefix = `_${actionKey}`;

  // Build JSX for each field — scoped to the action's typed components
  const fieldLines = fields.map((f) => {
    const props: string[] = [`name="${f.name}"`, `label="${f.label}"`];
    if (f.required) props.push("required");
    if (f.placeholder) props.push(`placeholder="${f.placeholder}"`);
    if (f.extraProps) props.push(f.extraProps);

    if (f.component === "FormSelect" && f.enumRef) {
      props.push(
        `options={Object.values(${f.enumRef}).map(v => ({ value: v, label: v.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase()) }))}`,
      );
    }

    return `      <${varPrefix}.${f.component} ${props.join(" ")} />`;
  });

  return `// --- ${actionKey} ---
const ${varPrefix} = createTypedForm<${schemaName}>();

export function ${formName}(props: GeneratedFormProps<${schemaName}>) {
  return (
    <${varPrefix}.FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.actionLabel}
      onSubmit={props.onSubmit}
      defaultValues={props.defaultValues}
      isSubmitting={props.isSubmitting}
    >
${fieldLines.join("\n")}
    </${varPrefix}.FormModal>
  );
}`;
}

function generateFormsFile(
  actions: Array<{
    actionKey: string;
    schemaName: string;
    fields: FormFieldInfo[];
  }>,
): string {
  // Collect all schema type imports and enum value imports
  const typeImports = new Set<string>();
  const valueImports = new Set<string>();

  for (const action of actions) {
    typeImports.add(action.schemaName);
    for (const f of action.fields) {
      if (f.enumRef) valueImports.add(f.enumRef);
    }
  }

  const typeImportLine =
    typeImports.size > 0
      ? `import type { ${[...typeImports].sort().join(", ")} } from "@/openapi/sloopquestAPI.schemas";`
      : "";
  const valueImportLine =
    valueImports.size > 0
      ? `import { ${[...valueImports].sort().join(", ")} } from "@/openapi/sloopquestAPI.schemas";`
      : "";

  const formComponents = actions
    .map((a) => generateFormComponent(a.actionKey, a.schemaName, a.fields))
    .join("\n\n");

  return `/**
 * Generated by generate-forms.ts — DO NOT EDIT
 */
import { createTypedForm } from "@/lib/forms/base";
import type { GeneratedFormProps } from "@/lib/forms/types";
${typeImportLine}
${valueImportLine}

${formComponents}
`;
}

function generateRegistryFile(
  actions: Array<{ actionKey: string; schemaName: string }>,
): string {
  const imports = actions
    .map((a) => `  ${actionKeyToFormName(a.actionKey)},`)
    .join("\n");

  const entries = actions
    .map(

      (a) => `  "${a.actionKey}": {
    render: (params) => <${actionKeyToFormName(a.actionKey)} {...params} />,
  }`,
    )
    .join(",\n");

  return `/**
 * Generated by generate-forms.ts — DO NOT EDIT
 */
import type { ReactElement } from "react";
import {
${imports}
} from "./forms.gen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generatedRegistry: Record<string, { render: (params: any) => ReactElement }> = {
${entries},
};
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [specRes, metaRes] = await Promise.all([
    fetch(OPENAPI_URL),
    fetch(ACTION_METADATA_URL),
  ]);

  if (!specRes.ok) {
    console.error(`Failed to fetch OpenAPI schema: ${specRes.status}`);
    process.exit(1);
  }
  if (!metaRes.ok) {
    console.error(`Failed to fetch action metadata: ${metaRes.status}`);
    process.exit(1);
  }

  const spec: OpenAPISchema = await specRes.json();
  const metadata: ActionMetadata = await metaRes.json();

  const formActions: Array<{
    actionKey: string;
    schemaName: string;
    fields: FormFieldInfo[];
  }> = [];

  for (const [actionKey, meta] of Object.entries(metadata)) {
    if (!meta.has_form || !meta.schema_name || !meta.fields) continue;

    const schemaName = meta.schema_name;
    const schemaObj = spec.components.schemas[schemaName];

    if (!schemaObj?.properties) {
      console.warn(`  ⚠ No properties on ${schemaName}, skipping ${actionKey}`);
      continue;
    }

    const requiredFields = new Set(schemaObj.required ?? []);

    // Build ordered field list
    const fieldsWithOrder: Array<{
      field: FormFieldInfo;
      order: number;
    }> = [];

    for (const [fieldName, prop] of Object.entries(schemaObj.properties)) {
      const fieldMeta = meta.fields[fieldName];
      const isRequired = requiredFields.has(fieldName);

      const field = inferFormField(
        fieldName,
        prop,
        spec,
        fieldMeta,
        isRequired,
      );
      if (!field) continue;

      fieldsWithOrder.push({
        field,
        order: fieldMeta?.order ?? 999,
      });
    }

    // Sort by order
    fieldsWithOrder.sort((a, b) => a.order - b.order);
    const fields = fieldsWithOrder.map((f) => f.field);

    if (fields.length === 0) {
      console.warn(
        `  ⚠ No form fields for ${actionKey} (all ID fields?), skipping`,
      );
      continue;
    }

    formActions.push({ actionKey, schemaName, fields });
  }

  if (formActions.length === 0) {
    console.log("  No actions with forms found, nothing to generate");
    return;
  }

  // Generate files
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const formsContent = generateFormsFile(formActions);
  const formsPath = join(OUTPUT_DIR, "forms.gen.tsx");
  writeFileSync(formsPath, formsContent);
  console.log(`  ✓ ${formsPath.replace(process.cwd() + "/", "")}`);

  const registryContent = generateRegistryFile(formActions);
  const registryPath = join(OUTPUT_DIR, "registry.gen.tsx");
  writeFileSync(registryPath, registryContent);
  console.log(`  ✓ ${registryPath.replace(process.cwd() + "/", "")}`);

  console.log(
    `\n  Generated ${formActions.length} form component(s) + registry`,
  );
}

main().catch((err) => {
  console.error("Form codegen failed:", err);
  process.exit(1);
});
