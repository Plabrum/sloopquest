# Dynamic Structured-Field Document Extraction

## Purpose

A reusable platform for turning unstructured documents (PDFs, emails, scans, images) into typed, schema-validated records that domain code can consume. The first consumer is **historic survey import** (user forwards an old survey PDF to `surveys@sloopquest.com` → completed `Survey` + `Vessel` + `Manufacturer` + inferred template materialize in their workspace). The platform should make the second, third, and Nth consumer cheap to add without re-architecting.

## Non-goals

- **Not a generic ETL framework.** It does not own persistence, transactions, or business logic. Domain consumers do.
- **Not a low-code extractor builder (v1).** Schemas are msgspec Structs in code, not user-editable JSON rows.
- **Not OCR.** We rely on the LLM provider's native PDF/image understanding. If a document is unreadable we fail, we do not run Tesseract.
- **Not a workflow engine.** Multi-pass extraction is a small, explicit orchestrator per extractor — not a DAG runtime.

## Design principles

1. **Three layers, separate concerns.** *Source* (how the doc arrived) → *Extractor* (prompts + schema + passes) → *Consumer* (domain action that does something with structured output). Each layer is independently testable and replaceable.
2. **The platform owns extraction, not persistence.** Every consumer writes its own domain action. There is no `save_extraction` button.
3. **Concrete first, abstract second.** A new document type ships as one new Extractor + one new Consumer. We resist generalizing further until a third use case demands it.
4. **Per-type trust policy.** Some sources are high-trust (current invoices) and need user review; others are low-trust (historic surveys) and ship straight to completed. The platform exposes the policy hook; consumers pick.
5. **Replayability.** Raw provider responses are persisted. Re-running an extraction never re-charges the LLM for unchanged inputs.

## Architecture

### 1. Source layer

A `DocumentSource` is anything that produces a `(bytes, mime_type, metadata)` triple plus enough context to route it.

Built-in sources:

- **Inbound email** (existing `platform/comms`): SES → S3 → `process_inbound_email` parses MIME, persists `Message`, uploads attachments. Routing hint: `to_email`, `from_email`, attachment filename.
- **Direct upload** (future): authenticated frontend POST → S3 → enqueue. Routing hint: user-selected `extractor_key`.
- **URL fetch** (future): paste a link, server fetches. Routing hint: domain + content-type sniff.

Sources are dumb. They land bytes and emit a `DocumentReceived` event with routing metadata. They never know which extractor will run.

### 2. Router

A single `ExtractionRouter` listens for `DocumentReceived` and picks an `Extractor` by matching registered rules:

```python
@extractor(
    key="survey_import",
    match=Match(to_email_equals="surveys@sloopquest.com", mime_in={"application/pdf"}),
)
class SurveyImportExtractor(Extractor): ...
```

Rules are evaluated in registration order; first match wins; no match → log + drop (or fall through to a `manual_review` extractor that just files the document for a human).

This is the layer that survives the longest. Adding a new document type is: write an `Extractor`, register a `Match`. No router changes.

### 3. Extractor

An `Extractor` declares:

- **Output schema**: a top-level msgspec `Struct` (may nest arbitrarily).
- **Passes**: an ordered list of `Pass` objects. Each pass declares its own sub-schema, prompt, and which prior-pass outputs (if any) it depends on. Passes in the same dependency tier run in parallel.
- **Provider preference**: `anthropic` | `openai` | `auto`. Default `auto` picks Anthropic for PDFs (native document blocks, no Files-API roundtrip).
- **Reducer**: a pure function `(pass_outputs) -> top_level_schema` that assembles the final typed result. Default is "spread fields by name."
- **Consumer key**: which downstream `Consumer` receives the typed result.

A pass is a single LLM call with a structured-output guarantee (tool-use forcing for Anthropic, `response_format=json_schema` for OpenAI). The pass adapter lives in `platform/llm/` and is the only place that talks to providers.

**Why passes instead of one big schema?** Long documents + giant nested schemas → truncation, hallucinated array entries, and silent partial output. A pass per concern (vessel facts / metadata / structural template / per-field values) keeps each schema small enough to be reliably generated, and lets us parallelize independent passes.

### 4. Consumer

A `Consumer` receives the typed result and does the domain work. It is just a function:

```python
async def consume_survey_import(
    transaction: AsyncSession,
    job: ExtractionJob,
    payload: SurveyImportPayload,
) -> ConsumerResult: ...
```

Consumers live in their domain folder (`domain/surveys/import.py`, `domain/invoices/import.py`, etc.), not in the platform. They call the same actions that hand-driven UI flows call (`create_survey`, `StateMachineService.transition`, …) — no parallel persistence path.

`ConsumerResult` returns the IDs of created records and a human-readable summary, which the platform uses to send the confirmation email.

### 5. Job state & replayability

One generic table, `extraction_jobs`:

| field | purpose |
|---|---|
| `id` | sqid |
| `source_kind` | `email` / `upload` / `url` |
| `source_ref` | FK or URI identifying the inbound artifact (e.g. `Message.id`) |
| `extractor_key` | matched extractor |
| `state` | `received → extracting → consuming → completed \| failed \| needs_review` |
| `raw_inputs_json` | normalized routing metadata |
| `pass_outputs_json` | per-pass typed outputs (raw provider responses cached separately if large) |
| `final_payload_json` | the reduced top-level schema |
| `consumer_result_json` | IDs and summary returned by the consumer |
| `error_json` | structured failure for replay |
| `created_at` / `updated_at` |

Replay = re-load row, skip passes whose `pass_outputs_json[pass_key]` is populated, re-run the rest, re-invoke consumer. This makes prompt iteration cheap and lets us re-process a backlog after a prompt change.

### 6. Trust policy

Each `Extractor` declares a `TrustPolicy`:

- `autocomplete` — consumer runs immediately, result is final (survey-import).
- `draft` — consumer runs but produces a draft record; user reviews in UI before promotion.
- `review_only` — extraction persists, consumer does not run; user accepts/edits/rejects in UI, then triggers `consume`.

The platform owns the state transitions; the UI for `draft` / `review_only` is generic across consumers (renders the typed payload against its schema). v1 ships `autocomplete` only; the schema for `draft`/`review_only` is reserved.

### 7. Confirmation / notification

On terminal state (`completed` or `failed`), the platform enqueues a notification via the existing `comms` send path. Each `Extractor` declares a `notify` callback that builds the template name + context (`survey_imported`, `invoice_imported`, etc.). On failure, a generic `extraction_failed` template tells the user we couldn't read the document, with the job ID for support.

## File layout

```
backend/app/platform/extraction/
  __init__.py
  models.py            # ExtractionJob + state enum
  router.py            # ExtractionRouter, Match, @extractor decorator
  extractor.py         # Extractor, Pass, TrustPolicy base classes
  llm_passes.py        # provider adapters: anthropic_pass, openai_pass
  service.py           # orchestrator: run_passes, reduce, dispatch_consumer, notify
  tasks.py             # SAQ task: run_extraction_job
  routes.py            # GET /extractions/:id, POST /extractions/:id/replay
  schemas.py           # API schemas (msgspec)
  state_machine.py
backend/app/domain/surveys/
  import.py            # SurveyImportExtractor + consume_survey_import + payload schemas
backend/app/domain/invoices/
  import.py            # future: InvoiceImportExtractor
```

Survey-specific code (`SurveyImportPayload`, the three passes, the consumer function) lives in `domain/surveys/`, not in the platform. The platform exposes the decorator and base classes; the domain provides the content.

## End-to-end example: historic survey import

1. User forwards a PDF survey to `surveys@sloopquest.com`.
2. SES drops MIME in S3; `process_inbound_email` parses, persists `Message`, uploads `attachment[0]` to `emails/attachments/{id}/`.
3. After upload, comms emits `DocumentReceived(source_kind="email", message_id=…, to_email="surveys@…", mime="application/pdf")`.
4. `ExtractionRouter` matches `SurveyImportExtractor`. Creates `ExtractionJob(state=received)`. Enqueues `run_extraction_job`.
5. Task loads PDF bytes; runs three passes (in parallel where dependencies allow):
   - **VesselPass** → make, model, HIN, year, length, owner.
   - **MetadataPass** → date, surveyor, location, scope, overall condition.
   - **TemplatePass** → inferred sections + fields + per-field values, all in one schema.
6. Reducer assembles `SurveyImportPayload`.
7. `consume_survey_import` runs: `get_or_create_manufacturer` → `get_or_create_vessel` → match-or-create template via `platform.embeddings.query.nearest(transaction, SurveyTemplate, inferred_name, min_similarity=…)` (reuse top hit above threshold, else create and let the `EmbeddableMixin` event hook backfill the vector) → `create_survey` (materializes nodes via existing path) → bulk-fill node responses → `StateMachineService.transition(survey, COMPLETED)`.
8. Platform emits `survey_imported` email with link to the new survey.
9. Job transitions to `completed`.

If any pass fails, job → `failed`, structured error captured, `extraction_failed` email sent with job ID.

## Tradeoffs and known soft spots

- **Template match-or-create via embeddings.** The embedding platform (`platform/embeddings/`) is live and `SurveyTemplate` already uses `EmbeddableMixin` (embeds `name`, 1536-dim). The consumer should call `nearest(...)` on the inferred template name and reuse the top hit above a similarity threshold; otherwise create. Threshold needs tuning during dogfooding — start strict (~0.92) to avoid cross-vessel-type collisions and relax based on observed misses.
- **No image extraction in v1.** Stub `extract_images_from_pdf(pdf_bytes) -> list[ExtractedImage]` lives in `domain/surveys/import.py` with a docstring detailing the eventual v2: PyMuPDF (`fitz`) for raster + bbox + page, upload via existing media platform, second vision call to attribute images to nodes. Not called by v1 consumer.
- **Schema authoring is code-only.** Non-engineers can't add a document type. Acceptable until we have ≥3 in-code extractors and a real ask.
- **Routing is a flat first-match list.** Fine for tens of extractors; if we hit hundreds (we won't), revisit.
- **No partial-success.** A pass failure fails the whole job. Could be relaxed per-pass via an `optional=True` flag if we hit cases where one pass is flaky but the rest are valuable.

## Open questions

1. **Replay on prompt change.** Should we version prompts and offer "replay every job whose extractor_key=X with the new prompt"? Cheap to add; useful for tuning. Probably yes, gated behind an admin route.
2. **Multi-attachment emails.** Survey-import v1 processes `attachment[0]` only. Do we fan out to one job per attachment, or one job with a list of inputs? Lean toward one job per attachment — simpler reducer.
3. **Cost ceilings.** Per-extractor max-token guards before we hit a $50 PDF? Probably defer until we see a bill we don't like.
4. **`needs_review` UI.** Generic schema-driven renderer (autoform-style) vs. per-extractor custom UI. Defer until first `draft`/`review_only` consumer exists.

## Roll-out

1. Land platform skeleton + `survey_import` extractor + `consume_survey_import` consumer behind a feature flag.
2. Dogfood by forwarding ~10 historic surveys; tune prompts; iterate via replay.
3. Lift feature flag.
4. Build second extractor (likely invoice ingest) — and use what we learn to refactor the platform's joints. Do not refactor sooner.
