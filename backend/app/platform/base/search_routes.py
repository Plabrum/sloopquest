from __future__ import annotations

import msgspec
from litestar import Router, get
from litestar.params import Parameter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.auth.guards import requires_session
from app.platform.base.search import SearchRegistry
from app.utils.sqids import Sqid


class SearchResult(msgspec.Struct):
    entity_type: str
    id: Sqid
    label: str
    sublabel: str | None
    path: str


class SearchResponse(msgspec.Struct):
    results: list[SearchResult]
    query: str
    entity_filter: str | None


def _sublabel(row: object, model_cls: type, term: str) -> str | None:
    term_lower = term.lower()
    for col_name in model_cls.trgm_columns:
        if col_name == model_cls.search_label_field:
            continue
        val = getattr(row, col_name, None)
        if val and term_lower in val.lower():
            return val
    return None


@get("/search", guards=[requires_session], tags=["search"])
async def search(
    transaction: AsyncSession,
    user: User,
    q: str = Parameter(query="q", default=""),
    limit: int = Parameter(query="limit", default=5, ge=1, le=50),
) -> SearchResponse:
    # Parse optional entity_type: prefix
    entity_filter: str | None = None
    term = q.strip()
    if ":" in term:
        prefix, rest = term.split(":", 1)
        prefix = prefix.strip()
        if prefix in SearchRegistry:
            entity_filter = prefix
            term = rest.strip()

    models_to_search = {
        key: cls
        for key, cls in SearchRegistry.items()
        if (entity_filter is None and cls.search_global) or entity_filter == key
    }

    results: list[SearchResult] = []

    for entity_type, model_cls in models_to_search.items():
        if not term:
            continue

        where_clauses = []

        # Org-scope: models with organization_id are filtered by org
        org_id_col = getattr(model_cls, "organization_id", None)
        if org_id_col is not None:
            where_clauses.append(org_id_col == user.organization_id)

        search_clause = model_cls.search_filter(term)
        if search_clause is None:
            continue
        where_clauses.append(search_clause)

        stmt = select(model_cls).where(*where_clauses).limit(limit)
        rows = (await transaction.execute(stmt)).scalars().all()

        for row in rows:
            results.append(
                SearchResult(
                    entity_type=entity_type,
                    id=row.id,
                    label=row.get_search_label(),
                    sublabel=_sublabel(row, model_cls, term),
                    path=f"{model_cls.search_detail_prefix}/{row.id}",
                )
            )

    return SearchResponse(
        results=results,
        query=term,
        entity_filter=entity_filter,
    )


search_router = Router(path="/", route_handlers=[search])
