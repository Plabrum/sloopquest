# Survey Workspace — Spec

The survey detail page is the marine surveyor's workspace. Everything else in the app (dashboard, surveys list, calendar, inbox) is supporting infrastructure they visit occasionally; this is where the work happens.

Mental model: **the survey is a document.** Sections are sticky headers, fields are blocks, scrolling moves through the survey end-to-end. Navigation, photos, vessel context, and findings are observers of "what section is in view," not drivers of "what's loaded."

## Layout

Five regions:

1. **App sidebar** (existing, global) — workspace nav, untouched.
2. **Top header** — breadcrumb (`Surveys / S/V Aurora / Hull & Bottom ▾`) where the section chip doubles as a ToC trigger; state badge with completion %; primary action (`Generate report` / state-machine next-step); overflow menu.
3. **Peek ToC** — Notion/Hex-style popover on the left edge. Lists all sections with status dot (empty / in-progress amber / complete green) and `n/m` field count. Triggered by hamburger, hover on left edge, breadcrumb chip click, or ⌘K. Pinnable. Auto-dismisses on outside click or section pick. **Not a persistent column** — the global app sidebar already lives there.
4. **Document column** — centered ~760px white cards on a soft gray canvas. Owns the scroll; header and right rail stay fixed. Sections render in order with sticky section headers; `scroll-snap-type: y proximity` so movement feels organized but doesn't fight a surveyor pausing mid-section.
5. **Right rail** (320px, fixed) — context that updates as the surveyor scrolls:
   - **Photos · {section}** with the in-section gallery
   - **Unassigned (n)** — photos that haven't been assigned to a section/field/finding yet, marked with an orange dashed border
   - **Vessel** — LOA, beam, draft, HIN, client (link)
   - **Findings (n)** — list of all findings on the survey, color-coded by severity; clicking jumps to the finding
   - **AI surveyor** — entry pinned to the bottom of the rail; opens a thread scoped to the current survey

On tablet/phone the right rail collapses to a bottom sheet with `Photos · Findings · Vessel` tabs. (Sketches TBD.)

## Features

### Sticky section headers
Each section header carries the section name, completion `n/m`, and a red-bordered `+ Add finding` button. Header sticks to the top of the document column while the surveyor scrolls through that section's fields, so the action and context are always visible.

### Inline field cards
Fields render as white cards inside the section. Card types match the existing template field types (text, select, segmented pills, number grids, notes, photos). A field can also be flagged as a finding inline, which creates a finding linked to that field — see Findings.

### Findings
First-class entity. A finding belongs to a survey + section (required) and optionally to a field. Created via the `+ Add finding` button in any section header, opening a popover with:

- **Severity** — `info` / `advisory` / `critical` (segmented)
- **Summary** — single-line headline
- **Detail** — multi-line notes
- **Recommended action** — optional
- **Photos** — attach via Camera, Library, or `From Unassigned (n)` (one-tap source from the rail's unassigned bucket)

Findings appear in the right rail as a running list; clicking jumps the doc to the originating section and highlights the finding.

### Photos
Photos belong to the survey and have a polymorphic assignment to one or more of `{section, field, finding}`. A photo with no assignments lives in the **Unassigned** bucket in the right rail.

Capture sources:
- **In-context capture** (camera button inside a field/finding/section) auto-assigns to that target.
- **Bulk import** (e.g., dump a card from the dock walkthrough) lands in Unassigned, where the surveyor drags onto a section or taps to pick a target.

### Auto-save
Per-field on blur. No "Save section" buttons. A quiet "Saved 2s ago" indicator lives in the header — invisible most of the time, only surfaces if save fails.

### Per-survey overrides
Templates are authored in settings and shipped pre-populated, but the workspace lets surveyors deviate without forking the template:

- **`+ Add field`** lives at the bottom of each subsection. Pops a small builder (label, type, options) and writes to `form_response.ad_hoc_fields`. Renders identically to template-defined fields, with a subtle "added on this survey" affordance.
- **`+ Add section`** lives at the bottom of the doc column. Same flow, writes to `form_response.ad_hoc_sections`.
- **Conditional sections** (e.g., Sea Trial when `sea_trial = false`) render as a collapsed "Skipped — sea trial not performed" placeholder with a "Mark as performed" toggle. Never silently omitted — surveyors should always see what they didn't fill in.
- **Repeaters** render as a stack of identical sub-cards with `+ Add another` and per-instance delete. Each instance becomes one logical row in the export.
- **Promote to template** — when a surveyor adds the same ad-hoc field across N surveys (threshold TBD), prompt: "Add this to the template permanently?" Routes them to the settings editor with the field pre-filled.

The shared JSON contract for templates and responses lives in [`template-schema.md`](./template-schema.md). The workspace renderer, settings editor, and report exporter all read against that schema.

### Deep links
`/surveys/:id#hull-bottom` scrolls to and stickies that section. Used by the AI surveyor to reference sections in chat replies and by the breadcrumb.

## User flows

### Resume a survey
1. Surveyor logs in → lands at `/` (dashboard, command center).
2. "Continue where you left off" surfaces the most-recently-edited in-progress survey.
3. One tap → `/surveys/:id`, doc scrolled to the last section they were in (deep link is persisted on every scroll-snap).

### Fill out a section on the dock
1. Surveyor walks the boat with a tablet open to the survey.
2. Scrolls to the section (sticky header anchors to top).
3. Taps fields, fills values; auto-save fires on blur.
4. Camera button on a field → captures photo → photo auto-attaches to that field.
5. Snap-scrolls to next section when done.

### Log a finding mid-inspection
1. Surveyor notices an issue (e.g., bottom blistering).
2. Taps `+ Add finding` in the sticky section header.
3. Picks severity, types summary + detail.
4. Adds photos: camera (just took some) or `From Unassigned (12)` (already photographed in a bulk pass).
5. Saves → finding appears in the right rail and (if linked to a field) renders an inline finding badge on that field.

### Bulk-import photos, then assign
1. Surveyor walks the boat first, just photographing — fast capture, no section context.
2. Back at the desk, opens the survey. Right rail shows `Unassigned (47)`.
3. Drags photos from the unassigned grid onto a section in the peek ToC or onto a field card.
4. Or: opens `+ Add finding`, picks `From Unassigned`, attaches the relevant ones.
5. Unassigned count drops as photos are placed.

### Generate a report
1. After all sections show green dots and findings are logged, surveyor taps `Generate report` in the header.
2. State machine transitions the survey; backend assembles the block-based export from sections + fields + findings + photos.
3. Report appears in the survey's reports list (existing infrastructure).

## Open questions

- **Scroll-snap aggressiveness.** `proximity` (forgiving) vs. `mandatory` (snappy) — needs prototyping with a surveyor.
- **Findings ordering** in the rail — by severity, by section order, or by recency? Default proposed: section order, then severity within.
- **Photo bulk-import UX** on web vs. mobile — drag-from-rail works on desktop, but on a tablet we may need a "Pick a target" sheet after multi-select.
- **AI surveyor entry placement** — bottom of the right rail (current sketch) vs. ⌘K-style global command bar in the header. Lean: rail for v1 (discoverable), add ⌘K later.

## Implementation status

### Done
- **Platform form-response engine** in `app/platform/form_dsl/`:
  - `FormNode` model — generic node tree owned polymorphically via `(owner_type, owner_id)` (mirrors the `threadable_type/_id` pattern).
  - `FormNodeKind` — `section | subsection | field | repeater_instance | annotation`.
  - `TemplateDefinition` Structs (metadata fields, sections → subsections → fields, repeaters, conditions, expanded `FieldType`, version).
  - `materialize_form_response(transaction, owner, owner_type, definition)` — walks the tree, inserts nodes, snapshots `config`, returns the template version for the caller to pin.
  - `FormResponseMixin` — gives any owner a `.form_nodes` relationship via the polymorphic key.
- **Survey consumer**: `Survey` uses `FormResponseMixin`; `CreateSurvey` calls the platform service and pins `template_version`. Survey-specific node kinds (e.g. `finding`) will be modeled as `kind='annotation'` with a discriminator in `value`.

### Milestones

Sequenced so each milestone is independently shippable and unblocks the next. The flat bullet lists below feed into these.

1. **M1 — Node read + write.** `UpdateNodeValue` action (per-`FieldType` msgspec validation against `config`), node-tree read path on `SurveyDetail` (or `GET /surveys/:id/nodes`), `pnpm codegen`. Unblocks UI scaffolding.
2. **M2 — Media on nodes.** Swap `survey_media.field_id` → `node_id` (FK, nullable = Unassigned), caption defaults from node label, soft-delete listener that NULLs `node_id` on the node's media. Unblocks the photo rail.
3. **M3 — Runtime nodes.** `AddRepeaterInstance`, `AddAdHocField`, `AddAdHocSection`, `AddFinding`, `DeleteNode`. Unblocks findings + ad-hoc UI.
4. **M4 — Conditions + completion.** Condition resolver (section + field), per-section `n/m`, "Skipped — …" placeholder support.
5. **M5 — Workspace shell.** Doc column with sticky section headers, peek ToC, right rail (Photos / Unassigned / Vessel / Findings / AI surveyor), breadcrumb with state badge + completion %. Auto-save wired to M1.
6. **M6 — Photo flows.** In-context capture (auto-assign), bulk import → Unassigned grid, drag-onto-section/field, `From Unassigned` picker in finding popover.
7. **M7 — Repeaters + findings UI.** `+ Add another` / per-instance delete, inline finding badge on linked fields, finding popover with severity + photos.
8. **M8 — Ad-hoc builders + conditional sections.** `+ Add field` / `+ Add section` builders, "Skipped — sea trial not performed" placeholder with "Mark as performed" toggle.
9. **M9 — Cleanup.** Drop `surveys.form_response`, `SaveSurveyResponse` action, `build_response_struct`.
10. **M10 — Report + template editor.** "Generate report" → state-machine transition + block-based export reader over `survey_nodes`; settings-side template editor round-tripping `TemplateDefinition`. "Promote ad-hoc → template" prompt lands here.

### Outstanding — backend
- **Media → nodes:** swap `survey_media.field_id` for `node_id` (nullable = Unassigned). Update `AttachSurveyMedia`, list schema, caption-defaults-from-node.
- **Soft-delete listener:** when a node is soft-deleted, cascade-UPDATE `survey_media.node_id = NULL` (photos return to Unassigned, not vanish).
- **Runtime node actions:**
  - `AddRepeaterInstance` — clones repeater child field defs into a `repeater_instance` + child `field` nodes.
  - `AddAdHocField` / `AddAdHocSection` — `schema_ref=null`, `config` carries the FieldDef.
  - `AddFinding` — `kind='finding'`, `value = {severity, summary, detail, recommended_action, originating_value_snapshot}`.
  - `UpdateNodeValue` — per-field auto-save (single-row UPDATE).
  - `DeleteNode` — soft-delete + the photo-detach side-effect above.
- **Read paths:**
  - Node tree for the workspace renderer (nested in `SurveyDetail` or dedicated `GET /surveys/:id/nodes`).
  - Findings list projection for the right rail (`kind='finding' AND survey_id=?`).
  - Unassigned-media query (`survey_media WHERE node_id IS NULL`).
  - Per-section completion `n/m` (non-null values / visible fields, respecting conditions).
- **Validation:** per-node value validated against `config.type` on update (msgspec dispatch by `FieldType`).
- **Condition resolver:** section- and field-level — reads `survey_metadata_fields` / siblings and returns visible/skipped status.
- **Cleanup:** drop dead `surveys.form_response` column, `SaveSurveyResponse` action, and `build_response_struct` once node-based save lands.

### Outstanding — frontend
- Workspace page replacing the current survey detail: doc column, sticky section headers, inline field cards per type, peek ToC, right rail (Photos/Unassigned/Vessel/Findings/AI surveyor), breadcrumb with state badge + completion %.
- Per-field auto-save (blur → `UpdateNodeValue`) + "Saved 2s ago" indicator.
- Finding popover + inline finding badge on linked fields.
- Photo flows: in-context capture (auto-assign), bulk import → Unassigned grid, drag-onto-section/field, `From Unassigned` picker in finding popover.
- Repeater UI (`+ Add another`, per-instance delete).
- Ad-hoc `+ Add field` / `+ Add section` builders.
- Conditional sections render as "Skipped — …" placeholder with "Mark as performed" toggle.
- Deep-link scroll-to-section (`#section-id`); persist last-section on scroll-snap for "Resume" flow.
- Tablet/mobile right rail collapses to bottom sheet (Photos · Findings · Vessel tabs).
- `pnpm codegen` after each new backend endpoint (no hand-written Orval hooks).

### Outstanding — cross-cutting
- Settings-side template editor that round-trips `TemplateDefinition`.
- "Generate report" → state-machine transition + block-based export reader over `survey_nodes`.
- "Promote ad-hoc field to template" prompt (threshold TBD).
- Seed/factory: realistic marine-survey template so the workspace has something to render in dev.

## Data model deltas

Detail lives in [`template-schema.md`](./template-schema.md). Summary:

- **`survey_nodes`** — new table, source of truth for response data. One row per addressable thing in a survey: section, subsection, field, repeater instance, finding. `kind` discriminates. `schema_ref` points back at the template node it was materialized from (null for ad-hoc/findings). `value` JSONB carries the field value or finding payload.
- **`survey_media.node_id`** — replaces `field_id`. FK to `survey_nodes.id`, nullable (NULL = Unassigned). Captions default to the resolved node's label on first attach.
- **Findings are nodes** with `kind='finding'`, parented to their originating section or field. Carry `severity`, `summary`, `detail`, `recommended_action?`, and `originating_value_snapshot` (text capture of the parent field's value at finding-creation time, so the export survives later edits).
- **Survey-level metadata fields** (`survey_type`, `overall_rating`, `market_value`, `in_water`, `sea_trial`, `out_of_water`) materialize as top-level field nodes with `parent_id = null`. They drive conditional sections.
- **`survey_templates.definition`** stays JSONB and is read-mostly. Surveys pin to the `template_version` they were created against; template edits don't retroactively mutate existing surveys.
