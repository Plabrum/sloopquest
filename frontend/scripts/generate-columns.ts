/**
 * Column definition codegen — reads OpenAPI schema + CRUD metadata
 * and generates typed column builder files for each CRUD resource.
 *
 * Run: npx tsx scripts/generate-columns.ts
 * Triggered automatically after Orval via the "codegen" npm script.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const OPENAPI_URL = process.env.OPENAPI_URL ?? "http://localhost:8000/schema/openapi.json";
const METADATA_URL = process.env.METADATA_URL ?? "http://localhost:8000/schema/crud-metadata";
const OUTPUT_DIR = join(import.meta.dirname, "../src/openapi");

// ---------------------------------------------------------------------------
// Types for OpenAPI parsing
// ---------------------------------------------------------------------------

interface OpenAPISchema {
  paths: Record<string, Record<string, OperationObject>>;
  components: { schemas: Record<string, SchemaObject> };
}

interface OperationObject {
  operationId: string;
  tags?: string[];
  responses: Record<string, { content?: Record<string, { schema: RefOrSchema }> }>;
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
}

type RefOrSchema = SchemaObject & { $ref?: string };

interface CrudMetadata {
  [operationId: string]: {
    filterable: string[];
    sortable: string[];
    column_types?: Record<string, string>;
    column_labels?: Record<string, string>;
  };
}

interface ColumnInfo {
  key: string;
  displayType: string;
  header: string;
  sortable: boolean;
  filterable: boolean;
  enumRef?: string; // TypeScript const name to import
  hideOnMobile?: boolean;
  className?: string;
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

function humanizeHeader(key: string): string {
  // created_at → Created, signed_up_by → Signed Up By, dob → DOB
  if (key === "dob") return "DOB";
  return key
    .replace(/_at$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isHidden(key: string, schema: RefOrSchema, spec: OpenAPISchema): boolean {
  if (key === "id" || key === "actions") return true;
  if (key.endsWith("_id")) return true;
  // Skip array-of-object fields
  if (schema.type === "array" && schema.items?.$ref) return true;
  // Skip composite-object refs (including nullable ones). Enums and EntityRef
  // are resolved into real display types further down; other Struct refs have
  // no sensible plain-text rendering.
  const { schema: unwrapped } = unwrapNullable(schema);
  if (unwrapped.$ref) {
    const name = refName(unwrapped.$ref);
    if (name === "EntityRef") return false;
    const resolved = resolveRef(spec, unwrapped.$ref);
    if (!resolved.enum) return true;
  }
  return false;
}

/**
 * Unwrap oneOf with null (nullable pattern) to get the real schema/ref.
 */
function unwrapNullable(prop: RefOrSchema): { schema: RefOrSchema; nullable: boolean } {
  if (prop.oneOf) {
    const nonNull = prop.oneOf.filter((s) => s.type !== "null");
    if (nonNull.length === 1) {
      return { schema: nonNull[0], nullable: true };
    }
  }
  return { schema: prop, nullable: false };
}

function inferColumn(
  key: string,
  prop: RefOrSchema,
  spec: OpenAPISchema,
  filterable: Set<string>,
  sortable: Set<string>,
  columnTypes: Record<string, string>,
  columnLabels: Record<string, string>,
): ColumnInfo | null {
  if (isHidden(key, prop, spec)) return null;

  const header = columnLabels[key] ?? humanizeHeader(key);
  const { schema } = unwrapNullable(prop);

  // EntityRef: relationship column rendered as a link
  if (schema.$ref && refName(schema.$ref) === "EntityRef") {
    return {
      key,
      displayType: "entity",
      header,
      sortable: sortable.has(key),
      filterable: false,
    };
  }

  // Resolve enum ref once — used by both the type override path and auto-detect
  let enumRef: string | undefined;
  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    if (resolved.enum) enumRef = refName(schema.$ref);
  }

  // Explicit type override from CRUD metadata (e.g. "duration", "status")
  if (columnTypes[key]) {
    return {
      key,
      displayType: columnTypes[key],
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
      enumRef,
    };
  }

  // Enum: $ref to a schema with enum values
  if (enumRef) {
    const STATE_KEYS = new Set(["state", "status", "outcome"]);
    const displayType = STATE_KEYS.has(key) ? "status" : "enum";
    return {
      key,
      displayType,
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
      enumRef,
    };
  }

  // Date
  if (schema.type === "string" && schema.format === "date") {
    return {
      key,
      displayType: "date",
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
    };
  }

  // Datetime
  if (schema.type === "string" && (schema.format === "date-time" || key.endsWith("_at"))) {
    return {
      key,
      displayType: "datetime",
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
      hideOnMobile: true,
    };
  }

  // Number
  if (schema.type === "integer" || schema.type === "number") {
    return {
      key,
      displayType: "number",
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
    };
  }

  // Boolean
  if (schema.type === "boolean") {
    return {
      key,
      displayType: "boolean",
      header,
      sortable: sortable.has(key),
      filterable: filterable.has(key),
    };
  }

  // Default: text
  return {
    key,
    displayType: "text",
    header,
    sortable: sortable.has(key),
    filterable: filterable.has(key),
  };
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateColumnFile(
  operationId: string,
  tag: string,
  itemSchemaName: string,
  columns: ColumnInfo[],
  meta: { filterable: string[]; sortable: string[] },
): string {
  const enumImports = Array.from(
    new Set(columns.filter((c) => c.enumRef).map((c) => c.enumRef!)),
  );

  const typeImport = `import type { ${itemSchemaName} } from "@/openapi/litestarAPI.schemas";`;
  const valueImports = enumImports.length > 0
    ? `import { ${enumImports.join(", ")} } from "@/openapi/litestarAPI.schemas";`
    : "";

  const builderChain = columns
    .map((col) => {
      const args: string[] = [`"${col.key}"`];
      const config: string[] = [`header: "${col.header}"`];
      if (col.sortable) config.push("sortable: true");
      if (col.filterable) config.push("filterable: true");
      if (col.hideOnMobile) config.push("hideOnMobile: true");
      if (col.className) config.push(`className: "${col.className}"`);
      if (col.enumRef) config.push(`options: Object.values(${col.enumRef})`);
      args.push(`{ ${config.join(", ")} }`);
      return `  .${col.displayType}(${args.join(", ")})`;
    })
    .join("\n");

  // Variable names: patientColumnDefs, PatientSortableColumn, PatientFilterableColumn
  const modelName = operationId.replace("list_", "");
  const varName = `${modelName[0].toLowerCase()}${modelName.slice(1)}ColumnDefs`;

  const constBlock = (name: string, keys: string[]) => {
    const entries = keys.map((k) => `  ${k}: '${k}',`).join("\n");
    return `export const ${name} = {\n${entries}\n} as const;`;
  };

  const sortableConst = meta.sortable.length > 0
    ? `\n${constBlock(`${modelName}SortableColumn`, meta.sortable)}\n`
    : "";
  const filterableConst = meta.filterable.length > 0
    ? `\n${constBlock(`${modelName}FilterableColumn`, meta.filterable)}\n`
    : "";

  return `/**
 * Generated by generate-columns.ts — DO NOT EDIT
 * Source: ${operationId} operation
 */
import { createColumnBuilder } from "@/lib/column-builder";
${typeImport}
${valueImports}

export const ${varName} = createColumnBuilder<${itemSchemaName}>()
${builderChain}
  .build();
${sortableConst}${filterableConst}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [specRes, metaRes] = await Promise.all([
    fetch(OPENAPI_URL),
    fetch(METADATA_URL),
  ]);

  if (!specRes.ok) {
    console.error(`Failed to fetch OpenAPI schema: ${specRes.status}`);
    process.exit(1);
  }
  if (!metaRes.ok) {
    console.error(`Failed to fetch CRUD metadata: ${metaRes.status}`);
    process.exit(1);
  }

  const spec: OpenAPISchema = await specRes.json();
  const metadata: CrudMetadata = await metaRes.json();

  let generated = 0;

  for (const [operationId, meta] of Object.entries(metadata)) {
    // Find the operation in the spec
    let operation: OperationObject | null = null;
    for (const methods of Object.values(spec.paths)) {
      for (const op of Object.values(methods)) {
        if (op.operationId === operationId) {
          operation = op;
          break;
        }
      }
      if (operation) break;
    }

    if (!operation) {
      console.warn(`Operation ${operationId} not found in OpenAPI spec, skipping`);
      continue;
    }

    // Resolve response → PagedResponse → items → item schema
    const respSchema = operation.responses?.["200"]?.content?.["application/json"]?.schema;
    if (!respSchema?.$ref) {
      console.warn(`No response ref for ${operationId}, skipping`);
      continue;
    }

    const pagedSchema = resolveRef(spec, respSchema.$ref);
    const itemsRef = pagedSchema.properties?.items?.items?.$ref;
    if (!itemsRef) {
      console.warn(`No items ref in PagedResponse for ${operationId}, skipping`);
      continue;
    }

    const itemSchemaName = refName(itemsRef);
    const itemSchema = resolveRef(spec, itemsRef);

    if (!itemSchema.properties) {
      console.warn(`No properties on ${itemSchemaName}, skipping`);
      continue;
    }

    // Infer columns
    const filterable = new Set(meta.filterable);
    const sortable = new Set(meta.sortable);
    const columnTypes = meta.column_types ?? {};
    const columnLabels = meta.column_labels ?? {};

    const columns: ColumnInfo[] = [];
    for (const [key, prop] of Object.entries(itemSchema.properties)) {
      const col = inferColumn(key, prop, spec, filterable, sortable, columnTypes, columnLabels);
      if (col) columns.push(col);
    }

    // Constrain long-text columns so they truncate instead of expanding the table
    for (const col of columns) {
      if (col.key === "description" && col.displayType === "text") {
        col.className = "max-w-[200px]";
      }
    }


    // Determine output path from tag
    const tag = (operation.tags?.[0] ?? operationId.replace("list_", "").toLowerCase());
    const outPath = join(OUTPUT_DIR, tag, "columns.gen.ts");

    mkdirSync(dirname(outPath), { recursive: true });
    const content = generateColumnFile(operationId, tag, itemSchemaName, columns, meta);
    writeFileSync(outPath, content);

    console.log(`  ✓ ${outPath.replace(process.cwd() + "/", "")}`);
    generated++;
  }

  console.log(`\n  Generated ${generated} column definition file(s)`);
}

main().catch((err) => {
  console.error("Column codegen failed:", err);
  process.exit(1);
});
