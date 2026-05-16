# Survey Template Schema

The shared contract between the template editor (settings), the survey workspace renderer, and the report exporter. Stored as JSONB on `survey_templates.definition` and `surveys.form_response`. Validated at the app layer with msgspec Structs — no schema migrations when adding field types.

## Versioning

- `definition.version` is bumped on every template edit.
- A survey records the `template_version` it was started against in `form_response.template_version`.
- In-progress surveys are **not** auto-migrated when their template changes. New surveys pick up the latest version.

## Identifiers

- `id` on sections, subsections, fields, and repeater fields is a stable slug or ULID assigned at authoring time.
- IDs are **never reused** after deletion — `SurveyMedia.field_id`, `Finding.section_id` / `field_id`, and deep links all point at them.
- Editor-side rule: renaming a field's label is fine; changing its `id` is a destructive operation that orphans media + findings.

## Template definition

```jsonc
{
  "version": 3,
  "survey_metadata_fields": [
    { "id": "survey_type", "type": "select", "label": "Type of survey",
      "options": ["Pre-Purchase", "Insurance", "Damage", "Appraisal"] },
    { "id": "in_water", "type": "boolean", "label": "In-water survey performed" },
    { "id": "sea_trial", "type": "boolean", "label": "Sea trial performed" },
    { "id": "out_of_water", "type": "boolean", "label": "Out-of-water inspection performed" },
    { "id": "overall_rating", "type": "select", "label": "Overall vessel rating",
      "options": ["Excellent", "Above Average", "Average", "Fair", "Poor", "Restorable"] },
    { "id": "market_value", "type": "currency", "label": "Estimated market value" }
  ],
  "sections": [
    {
      "id": "hull-deck",
      "title": "Hull, Deck & Superstructure",
      "condition": null,
      "subsections": [
        {
          "id": "hull-construction",
          "title": "Hull Construction",
          "fields": [ /* field defs */ ]
        }
      ]
    },
    {
      "id": "sea-trial",
      "title": "Sea Trial",
      "condition": { "field": "sea_trial", "equals": true },
      "subsections": [ /* ... */ ]
    }
  ]
}
```

A section with no logical subdivision still has one anonymous subsection — keeps the renderer uniform.

## Field definition

```jsonc
{
  "id": "hull-material",
  "label": "Material",
  "type": "select",
  "required": false,
  "allow_finding": true,
  "config": { /* type-specific */ },
  "condition": null
}
```

`allow_finding: true` shows the inline "flag as finding" affordance on the field card. Defaults to true.

## Field types

| `type`            | Stored value shape                      | Notes                                                              |
|-------------------|-----------------------------------------|--------------------------------------------------------------------|
| `text`            | `string`                                | Single-line.                                                       |
| `longtext`        | `string`                                | Multi-line, markdown-lite.                                         |
| `select`          | `string` (one of `config.options`)      | `config.options: string[]`.                                        |
| `multiselect`     | `string[]`                              | Same `config.options`.                                             |
| `segmented`       | `string`                                | Same data as `select`; renders as pill row.                        |
| `number`          | `number`                                | `config.unit?`, `config.min?`, `config.max?`.                      |
| `currency`        | `number` (USD cents)                    |                                                                    |
| `date`            | ISO date string                         |                                                                    |
| `boolean`         | `boolean`                               |                                                                    |
| `photo`           | `string[]` of `media.id`                | Authoritative link still lives in `survey_media`.                  |
| `table`           | `{ columns: string[], rows: any[][] }`  | `config.columns: { id, label, type }[]`. Used for RPM/knots, etc.  |
| `repeater`        | `Array<{ [field_id]: value }>`          | See below.                                                         |
| `static_text`     | n/a (template-owned prose)              | Boilerplate (Scope of Survey, Definitions, Certification).         |
| `signature`       | `{ media_id, signed_at, signer_name }`  | Surveyor signature on the report.                                  |
| `annotated_image` | `{ base_image_id, markers: [...] }`     | Thru-hull diagram, hull blister map, etc.                          |

## Repeater

Used for "two engines", "three A/C units", "multiple heads".

```jsonc
{
  "id": "main-engines",
  "type": "repeater",
  "label": "Main Engines",
  "min": 0,
  "max": null,
  "instance_label_field": "position",
  "fields": [
    { "id": "position", "type": "select", "label": "Position",
      "options": ["Port", "Starboard", "Center"] },
    { "id": "manufacturer", "type": "text", "label": "Manufacturer" },
    { "id": "serial", "type": "text", "label": "Serial" },
    { "id": "hours", "type": "number", "label": "Indicated hours" }
  ]
}
```

Findings on a repeater field carry `instance_index` so the export can render `Main Engines · Port · Hours`.

## Conditions

Only one form supported in v1:

```json
{ "field": "<survey_metadata_field_id or sibling_field_id>", "equals": <value> }
```

- Section-level condition hides/skips the section in the doc column (renders as a collapsed "Skipped" placeholder, not omitted entirely — surveyors should always see what they didn't fill in).
- Field-level condition hides the field card.
- Resolution scope: section conditions read from `survey_metadata_fields`; field conditions read from sibling fields in the same subsection or from `survey_metadata_fields`.

Richer expressions (AND/OR, comparisons) are explicitly out of scope until a customer asks.

## Survey node materialization

The template definition is JSONB and read-mostly. The **response** is materialized into a relational `survey_nodes` table at survey creation. `survey_nodes` is the source of truth for response data — there is no `form_response` JSONB blob holding values.

Why: per-field auto-save becomes a single-row UPDATE (no JSONB rewrites, no lost-update races); media gets a real FK target; "all media under section X" and "findings on this survey" are SQL joins; ad-hoc fields and repeater instances are just rows.

```
survey_nodes
  id                uuid pk
  survey_id         fk surveys
  parent_id         uuid fk survey_nodes (null for top-level)
  kind              text   # section | subsection | field | repeater_instance | finding
  schema_ref        text   # template node id this row was materialized from; null for ad-hoc / findings
  label             text   # cached for display + caption defaulting
  value             jsonb  # field value; shape depends on field type (see table above)
  config            jsonb  # field type config snapshot (options, etc.) — survives template edits
  sort_order        int
  created_at, updated_at, deleted_at
```

### Materialization on survey create

When a survey is created from a template at version `v`:

1. Walk `template.definition.sections → subsections → fields`.
2. Insert one `survey_nodes` row per node, copying `id → schema_ref`, `label`, type-specific `config`. Repeaters insert the field-shell row; instances are created at runtime when the surveyor adds them.
3. Record `template_version = v` on the survey.
4. Survey-level metadata (`survey_metadata_fields`) materializes as top-level field nodes with `parent_id = null`.

### Runtime-created nodes

- **Repeater instance**: `kind='repeater_instance'`, `parent_id` = the repeater field node, `schema_ref` = null. Children are field nodes copied from the repeater's `fields` definition. Created eagerly on `+ Add another` click (not lazily on first field blur) so the surveyor has something to attach photos and findings to before filling values.
- **Ad-hoc field**: `kind='field'`, `schema_ref = null`, `config` carries the full FieldDef. Lives under the section/subsection the surveyor added it to.
- **Ad-hoc section**: `kind='section'` with `schema_ref = null`. Children created the same way.
- **Finding**: `kind='finding'`, `parent_id` = the section or field node it was logged against. `value` carries `{ severity, summary, detail, recommended_action, originating_value_snapshot }`.

Findings as nodes (rather than a separate `findings` table) means media attachment, sort order, and soft-delete behave uniformly. The right rail's findings list is `WHERE kind='finding' AND survey_id = ?`.

### Template edits to in-progress surveys

Surveys pin to the `template_version` they were created against. Template edits do **not** retroactively mutate `survey_nodes`. The cached `label` and `config` on each row mean the survey renders correctly even if the template node is later renamed or deleted.

## Media attachment

```
survey_media
  id, survey_id, media_id           (existing)
  node_id           uuid fk survey_nodes  NULL    # NULL = Unassigned bucket
  caption           text NULL
  sort_order        int
```

- One row per attachment. A photo can be attached to multiple nodes via multiple rows.
- `node_id IS NULL` is the Unassigned bucket — surfaced in the right rail.
- `node_id` FKs to any node kind: section, subsection, field, repeater instance, finding. The kind is implicit in the resolved node.
- **Caption defaults** to the resolved node's `label` on first attach (e.g., "Port engine", "Hull material", "Bottom blistering"). Surveyor can overwrite. Blank captions render as the node label in exports.
- `sort_order` controls display order within a node's gallery and in the report's photo section. Drag-to-reorder in the UI.
- Soft-deleting a node nulls `node_id` on its `survey_media` rows (cascade UPDATE, not cascade soft-delete) — the photos return to the Unassigned bucket rather than disappearing with the node. Media itself is never deleted by node operations (it's a survey-level asset).

## Validation

- Template definitions are validated through msgspec Structs at the app boundary. DB-level constraint is just "is valid JSON".
- `survey_nodes.value` is validated per-row against the field type recorded in `config`.
- IDs unique within their parent at the template layer (section IDs unique in template; field IDs unique within subsection). At the node layer, uniqueness is just the UUID PK.
- Field type changes on an existing template field require confirmation in the editor and may invalidate stored node values for in-progress surveys — surfaced as a warning, not a hard block.

## Validation

- Template definitions and survey responses are validated through msgspec Structs at the app boundary (CRUD action layer). DB-level constraint is just "is valid JSON".
- IDs unique within their parent (section IDs unique in template; field IDs unique within subsection).
- Field type changes on an existing field ID require a confirmation in the editor and may invalidate stored values — surfaced as a warning, not a hard block.
