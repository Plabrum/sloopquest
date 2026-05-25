# Embeddings Platform

## Purpose

A reusable mechanism for attaching vector embeddings to any SQLAlchemy model so we can do semantic similarity queries (template match-or-create, related-survey lookup, semantic search) without re-implementing the embed/store/refresh loop each time. Adding embeddings to a new model should be: inherit the mixin, declare which columns matter, run a migration. That's it.

## Non-goals

- **Not a vector DB.** We use pgvector inside Postgres — no Pinecone/Weaviate/Qdrant.
- **Not a RAG framework.** This stores and queries vectors. Retrieval-augmented prompts are composed by callers.
- **Not multi-modal.** v1 embeds strings. Image embeddings are a v2 concern (different model, different dim, likely a separate mixin).
- **Not a reranker.** Cosine similarity only. If we need reranking we'll add it as a separate concern, not bolt it on here.

## Design principles

1. **One mixin, one column set, one task.** Adding embeddings to a model is declarative — mirror the existing `SearchMixin` (`trgm_columns` / `fts_columns`) shape so it's already familiar.
2. **Event-driven, not swept.** SQLAlchemy `after_insert` / `after_update` listeners attached by the mixin enqueue embedding tasks at commit time. The optional sweeper exists only as a backstop for outages and model upgrades — off by default.
3. **Skip-when-unchanged.** Listeners short-circuit unless one of the declared embedding columns was actually dirtied. This makes the mixin safe to add to hot tables.
4. **Content hash drives freshness.** Every embed records a sha256 of the exact string that was embedded. Stale = hash of current content ≠ stored hash. Missing = stored hash is null. That single signal handles "never embedded", "row changed", "embed failed mid-write", and "model upgraded" (the latter via separate model-name comparison).
5. **Cheapest model that works.** Default to OpenAI `text-embedding-3-small` (1536 dims, $0.02/1M tokens). Per-model upgrades are explicit and trigger re-embedding via the model-name column.
6. **Pgvector indexes are opt-in per-table.** Small tables (templates) don't need an index. Large tables (survey nodes, if we ever embed those) get an HNSW index in their migration.

## Architecture

### 1. Mixin

```python
# backend/app/platform/embeddings/mixin.py

from typing import ClassVar
from sqlalchemy import DateTime, String, LargeBinary, event
from sqlalchemy.orm import Mapped, mapped_column, declared_attr, object_session
from pgvector.sqlalchemy import Vector

class EmbeddableMixin:
    """Declarative embedding columns + content contract.

    Subclasses declare:
      - `embedding_columns: ClassVar[list[str]]` — column names whose concatenated
        text gets hashed and embedded. Mirrors the SearchMixin shape.
      - `embedding_dim: ClassVar[int]` — matches the configured model's output dim.
      - Optionally override `embedding_content()` for non-trivial joins
        (e.g. pulling section/field names off a relationship).
    """

    embedding_columns: ClassVar[list[str]] = []
    embedding_dim: ClassVar[int]
    embedding_model: ClassVar[str] = "text-embedding-3-small"
    sweep_enabled: ClassVar[bool] = False  # backstop only

    @declared_attr
    @classmethod
    def embedding(cls) -> Mapped[list[float] | None]:
        return mapped_column(Vector(cls.embedding_dim), nullable=True)

    embedded_at: Mapped["datetime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    embedded_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    embedding_content_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32), nullable=True)
    # sha256 raw bytes — 32B, byte-comparable, no encoding ambiguity

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if not cls.embedding_columns and "embedding_content" not in cls.__dict__:
            return  # nothing to embed; mixin is inert
        event.listen(cls, "after_insert", _stage_embed_after_insert)
        event.listen(cls, "after_update", _stage_embed_after_update)

    def embedding_content(self) -> str:
        # Default: concatenate declared columns in declaration order.
        # Override for joins/relationships.
        return "\n".join(
            str(getattr(self, c) or "") for c in type(self).embedding_columns
        )

    def is_embedding_stale(self) -> bool:
        if self.embedding is None or self.embedding_content_hash is None:
            return True
        if self.embedded_model != type(self).embedding_model:
            return True
        return _sha256(self.embedding_content()) != self.embedding_content_hash
```

Why these columns:

- `embedding` — the vector. Nullable so "needs embedding" is representable.
- `embedded_at` — observability and TTL eviction if we ever want it.
- `embedded_model` — detects model upgrades. If we move from `-small` to `-large`, every row's `embedded_model` mismatches the class const → next embed cycle picks them up. No manual backfill script.
- `embedding_content_hash` — 32 raw bytes (sha256). Detects content changes without storing the content twice.

### 2. Auto-registration via `__init_subclass__`

Mirrors `SearchMixin`. Defining a subclass with `embedding_columns` is sufficient — listeners attach automatically, no decorator, no registry table.

The sweeper (when enabled) discovers embeddable classes by walking `BaseDBModel.registry.mappers` and filtering by `issubclass(m.class_, EmbeddableMixin)`. SQLAlchemy already maintains that list; we don't need a parallel index.

### 3. Event flow — enqueue at commit, not flush

```python
def _stage_embed_after_insert(mapper, connection, target):
    # New rows are always "stale" (no embedding yet) — no dirty check needed.
    _stage(target)

def _stage_embed_after_update(mapper, connection, target):
    # Skip if none of the declared embedding columns were dirtied this flush.
    state = sa.inspect(target)
    dirty_cols = {attr.key for attr in state.attrs if attr.history.has_changes()}
    if not (dirty_cols & set(type(target).embedding_columns)):
        return
    _stage(target)

def _stage(target):
    session = object_session(target)
    if session is None:
        return
    # Stage the object itself; read .id at after_commit when the PK is
    # guaranteed populated regardless of default-generation mode.
    session.info.setdefault("_pending_embeds", []).append(target)

@event.listens_for(Session, "after_commit")
def _flush_pending_embeds(session):
    pending = session.info.pop("_pending_embeds", [])
    for target in pending:
        # `enqueue` is the SAQ queue accessor — pulled from a context var so
        # the listener stays test-friendly.
        enqueue("embed_row_task", table=target.__tablename__, id=target.id)
```

**Why after_commit:** if we enqueued during flush, the worker could pick up the task before the row is visible (or, worse, after a rollback). Staging in `session.info` and draining at `after_commit` keeps the enqueue tied to the same transaction's success. It also means we read `target.id` post-commit, when it's reliably populated — no `setattr` workarounds, no `eager_defaults` opt-in, no listener override for server-side-default PKs.

**Why the dirty-column check:** without it, every save re-enqueues. With it, the mixin is safe on hot tables — a save that only touches unrelated columns is a no-op for embeddings. For inserts we skip the check (new rows are always "needs embedding").

**Why we still hash:** the dirty check is a fast prefilter on columns, not values. The hash is the *correctness* check — `embed_row_task` re-computes content, hashes, and compares to `embedding_content_hash` before calling the embedding API. If they match (e.g. user wrote the same value back), we skip the API call but still bump `embedded_at`.

### 4. Embedding client

```python
# backend/app/platform/embeddings/client.py

class EmbeddingClient(ABC):
    model: str
    dim: int
    async def embed(self, texts: list[str]) -> list[list[float]]: ...

class OpenAIEmbeddingClient(EmbeddingClient):
    model = "text-embedding-3-small"
    dim = 1536
    # POSTs to /v1/embeddings with `input=[...]`, returns list-of-vectors.
    # Batch up to 2048 inputs per request (OpenAI limit); enforce 100 in practice.
```

A single client per provider. Configurable via env (`EMBEDDING_PROVIDER=openai`). Wired through factory and dep-injected like the LLM client.

### 5. Task

```python
# backend/app/platform/embeddings/tasks.py

@task
@with_transaction
async def embed_row_task(ctx, transaction, *, table: str, id: int) -> dict:
    """Embed a single row. Idempotent; safe to invoke any number of times.

    1. Load row by (table, id) via the mapper registry.
    2. Compute content + sha256.
    3. If hash matches stored hash AND model matches → bump embedded_at, return.
    4. Else call EmbeddingClient.embed([content]); write (vector, hash, model, embedded_at).
    """
```

Failure leaves the row in its prior state. The next save (or the sweeper, if enabled) retries. No retry counter, no DLQ — embeddings are cheap and idempotent.

### 6. Sweeper (backstop)

```python
@task
async def sweep_embeddings_task(ctx, *, limit_per_model: int = 500) -> dict:
    """Find stale/missing embeddings on classes where sweep_enabled=True.

    For each embeddable class with sweep_enabled = True:
        SELECT id ... WHERE embedding IS NULL
                        OR embedding_content_hash IS NULL
                        OR embedded_model != :class_model
        LIMIT :limit_per_model
    Enqueue embed_row_task per row.
    """
```

Off by default. Flip on for:
- A model upgrade (sweep once, flip off).
- Recovery from a worker outage where after-commit enqueues were dropped.
- Tables where event-driven coverage is known to be lossy (e.g. bulk SQL updates that bypass ORM events — `UPDATE … SET …` via `connection.execute`).

### 7. Similarity query helper

```python
# backend/app/platform/embeddings/query.py

async def nearest(
    transaction: AsyncSession,
    model_cls: type[EmbeddableMixin],
    query_text: str,
    limit: int = 5,
    min_similarity: float | None = None,
    filters: list[ColumnElement] | None = None,
) -> list[tuple[Any, float]]:
    """Embed query_text, return rows with cosine similarity, optionally filtered."""
```

Uses pgvector's `<=>` cosine distance operator. Caller passes RLS-respecting filters (e.g. `SurveyTemplate.team_id == team.id`); helper does not assume tenancy.

### 8. Migrations

- One migration adds the `vector` extension globally.
- Each embeddable table's migration adds the four columns and (optionally) an HNSW index:

```sql
CREATE INDEX ON survey_templates USING hnsw (embedding vector_cosine_ops);
```

HNSW is opt-in because the index has nontrivial build cost. Templates table is fine without one for years; survey_nodes (if embedded) needs it.

## File layout

```
backend/app/platform/embeddings/
  __init__.py
  mixin.py             # EmbeddableMixin + __init_subclass__ listener attach
  events.py            # _stage_embed_*, after_commit flusher
  client.py            # EmbeddingClient + OpenAIEmbeddingClient
  tasks.py             # embed_row_task, sweep_embeddings_task
  query.py             # nearest() helper
  hash.py              # _sha256(str) -> bytes (just hashlib but centralized)
  deps.py              # provide_embedding_client
```

No `models.py` — the platform itself has no tables. All state lives on the consuming domain's table.

## End-to-end example: template match-or-create for survey import

1. `SurveyTemplate(BaseDBModel, EmbeddableMixin)` declares `embedding_columns = ["name", "description"]` and overrides `embedding_content()` to join section + field names from its relationship. Sets `embedding_dim = 1536`. Migration adds the four columns + HNSW index.
2. On the first `session.commit()` after a template insert/update touching the declared columns, `after_commit` drains the pending list and enqueues `embed_row_task`.
3. `embed_row_task` hashes content, compares to stored hash, calls OpenAI if stale, writes back.
4. In `consume_survey_import`, after inferring a candidate template structure, call `nearest(transaction, SurveyTemplate, content, filters=[SurveyTemplate.team_id == team.id], min_similarity=0.85)`.
5. Match → reuse template. No match → create new (auto-embed kicks in at commit).
6. The `# TODO(embedding-platform)` marker in `consume_survey_import` is removed.

## Tradeoffs and soft spots

- **`text-embedding-3-small` is the default.** It's cheap and good enough for short, structured content (template signatures, vessel names). For long-form prose we may want `-large` later. Switching is a single class-const change; flip `sweep_enabled=True`, run a sweep, flip it off.
- **Bulk SQL updates bypass events.** `UPDATE survey_templates SET name = …` via raw `connection.execute()` won't fire `after_update`. Either always go through the ORM or flip `sweep_enabled=True` for the affected model.
- **`object_session(target)` can be None.** Detached objects produced by background jobs may not have a session at event time. We skip silently — the row will be picked up next time it goes through a session, or by the sweeper.
**No multi-model per row.** A row has one embedding. If we ever want both a content embedding and a title embedding on the same row, we'll add a second mixin or a polymorphic `Embedding` table — but not before we need it.
- **Pgvector index choice (HNSW vs IVFFlat).** HNSW is the modern default; faster recall, slower build. Use HNSW unless a specific table has very high write churn.

## Open questions

1. **Should `embedded_at` drive a hard TTL?** Probably not — content-hash is a strictly better signal. Keep `embedded_at` for observability only.
2. **Per-team vs global embeddings.** Templates are per-team; their embeddings are co-located on the row, so RLS already partitions them. Cross-team embeddings (e.g. a manufacturer catalog) would live on a global table — fine, same mixin.
3. **Hybrid search** (lexical + vector reranked). Not v1. If we need it, layer trigram/FTS scores with vector scores in a SQL CTE — don't introduce an external reranker.
4. **Anthropic embeddings.** Anthropic doesn't currently ship a first-party embedding API. Voyage is their recommended provider. If we ever consolidate on Anthropic-stack vendors, swap the client; the mixin doesn't change.

## Roll-out

1. Land platform (mixin with auto-attached listeners, client, task, query helper, sweeper-off-by-default) + global `vector` extension migration. No consumers.
2. Make `SurveyTemplate` embeddable, add HNSW index, wire `nearest()` into `consume_survey_import`. Remove the always-create TODO.
3. Backfill: flip `sweep_enabled=True` once after deploy, sweep populates existing rows, flip it off.
4. Next consumer (manufacturers? vessels?) ships as one mixin application + one migration.
