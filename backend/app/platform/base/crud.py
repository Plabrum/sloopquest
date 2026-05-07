from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, get_type_hints

from litestar import Controller, get, post
from litestar.exceptions import NotFoundException
from msgspec import Struct
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.users.models import User
from app.platform.actions.registry import ActionRegistry
from app.platform.auth.guards import requires_session
from app.platform.base.filters import apply_filter, apply_sorts
from app.platform.base.models import BaseDBModel
from app.platform.base.registry import BaseRegistry
from app.platform.base.schemas import ListRequest, PagedResponse
from app.platform.base.search import SearchMixin
from app.utils.sqids import Sqid

# Populated by make_crud_controller — exposed via GET /schema/crud-metadata for codegen.
_crud_metadata: dict[str, dict] = {}


@dataclass
class CRUDEntry:
    path: str
    config: "CRUDConfig"


class CRUDRegistry(BaseRegistry[type, CRUDEntry]):
    pass


@dataclass
class CRUDConfig[ModelT: BaseDBModel, ListT: Struct, DetailT: Struct]:
    """Declarative configuration for a resource's read endpoints."""

    model: type[ModelT]

    to_list_item: Callable[[ModelT, User], ListT]
    to_detail: Callable[[ModelT, User], DetailT]

    list_load_options: list[Any] = field(default_factory=list)
    detail_load_options: list[Any] = field(default_factory=list)

    filterable_columns: set[str] | None = None
    sortable_columns: set[str] | None = None
    default_sort: str | None = None  # e.g. "activity_date" — defaults to "created_at" desc

    # Label field used by entity combobox codegen
    label_field: str | None = None

    # Codegen metadata hints
    column_types: dict[str, str] = field(default_factory=dict)
    column_labels: dict[str, str] = field(default_factory=dict)

    # Custom filter handlers for columns that aren't direct model attributes.
    # Signature: (query, FilterDefinition) -> query
    custom_filters: dict[str, Callable] = field(default_factory=dict)

    extra_guards: list[Any] = field(default_factory=list)
    # Guards applied only to list (POST /) — on top of `extra_guards`.
    list_extra_guards: list[Any] = field(default_factory=list)
    # Guards applied only to detail (GET /{id}) — on top of `extra_guards`.
    detail_extra_guards: list[Any] = field(default_factory=list)

    # When False, don't generate the GET /{id} handler — the caller is
    # providing a custom detail handler (e.g. role-aware filtering).
    expose_detail: bool = True

    # Optional hook to modify the base query per-request (e.g. role-based scoping).
    # Signature: (query, user) -> query
    base_query_modifier: Callable[[Any, "User"], Any] | None = None


def make_crud_controller[ModelT: BaseDBModel, ListT: Struct, DetailT: Struct](
    path: str,
    config: CRUDConfig[ModelT, ListT, DetailT],
) -> type[Controller]:
    """Generate a Litestar Controller with list (POST /) and detail (GET /{id}) routes."""
    model = config.model
    guards = [requires_session, *config.extra_guards]
    list_guards = [*guards, *config.list_extra_guards]
    detail_guards = [*guards, *config.detail_extra_guards]
    model_name = model.__name__

    # Resolve mixin columns at factory time so we get clean errors if missing
    org_id_col = getattr(model, "organization_id")
    deleted_at_col = getattr(model, "deleted_at", None)
    default_sort_col = getattr(model, config.default_sort or "created_at")

    # Infer concrete return types from callable annotations for OpenAPI generation.
    # PEP 695 type params aren't resolved at runtime, so Litestar needs concrete types.
    hints = get_type_hints(config.to_list_item)
    list_item_type = hints.get("return", Struct)
    detail_hints = get_type_hints(config.to_detail)
    detail_type = detail_hints.get("return", Struct)

    @post("/", guards=list_guards, tags=[model_name.lower()], status_code=200, operation_id=f"list_{model_name}")
    async def list_handler(
        self,
        data: ListRequest,
        user: User,
        transaction: AsyncSession,
        action_registry: ActionRegistry,
    ) -> PagedResponse:
        # Clamp limit and offset
        limit = max(1, min(data.limit, 200))
        offset = max(0, data.offset)

        # Base query: org-scoped, soft-delete if supported
        conditions = [org_id_col == user.organization_id]
        if deleted_at_col is not None:
            conditions.append(deleted_at_col.is_(None))
        base = select(model).where(*conditions)

        # Role-based query scoping
        if config.base_query_modifier is not None:
            base = config.base_query_modifier(base, user)

        # Load options
        for opt in config.list_load_options:
            base = base.options(opt)

        # Search
        if data.search and issubclass(model, SearchMixin):
            search_cond = model.search_filter(data.search)
            if search_cond is not None:
                base = base.where(search_cond)

        # Filters
        for f in data.filters:
            if f.column in config.custom_filters:
                base = config.custom_filters[f.column](base, f)
            else:
                base = apply_filter(base, model, f, config.filterable_columns)

        # Sorts (default: created_at desc)
        if data.sorts:
            base = apply_sorts(base, model, data.sorts, config.sortable_columns)
        else:
            base = base.order_by(default_sort_col.desc())

        # Count total
        count_q = select(func.count()).select_from(base.subquery())
        total = (await transaction.execute(count_q)).scalar_one()

        # Paginate
        paginated = base.offset(offset).limit(limit)
        result = await transaction.execute(paginated)
        rows = list(result.scalars().all())

        items = [config.to_list_item(row, user) for row in rows]

        return PagedResponse(
            items=items,
            total=total,
            offset=offset,
            limit=limit,
            has_more=offset + len(items) < total,
        )

    list_handler.fn.__annotations__["return"] = PagedResponse[list_item_type]

    @get("/{id:str}", guards=detail_guards, tags=[model_name.lower()])
    async def detail_handler(
        self,
        id: Sqid,
        user: User,
        transaction: AsyncSession,
        action_registry: ActionRegistry,
    ) -> Struct:
        detail_conditions = [model.id == id, org_id_col == user.organization_id]
        if deleted_at_col is not None:
            detail_conditions.append(deleted_at_col.is_(None))
        query = select(model).where(*detail_conditions)
        if config.base_query_modifier is not None:
            query = config.base_query_modifier(query, user)
        for opt in config.detail_load_options:
            query = query.options(opt)

        result = await transaction.execute(query)
        obj = result.scalar_one_or_none()
        if obj is None:
            raise NotFoundException()

        return config.to_detail(obj, user)

    detail_handler.fn.__annotations__["return"] = detail_type

    # Build controller class dynamically
    class_attrs: dict[str, Any] = {
        "path": path,
        "list_handler": list_handler,
    }
    if config.expose_detail:
        class_attrs["detail_handler"] = detail_handler
    controller_cls = type(
        f"{model_name}CRUDController",
        (Controller,),
        class_attrs,
    )

    # Register metadata for codegen (GET /schema/crud-metadata)
    metadata: dict[str, object] = {
        "filterable": sorted(config.filterable_columns or []),
        "sortable": sorted(config.sortable_columns or []),
    }
    if config.column_types:
        metadata["column_types"] = config.column_types
    if config.column_labels:
        metadata["column_labels"] = config.column_labels
    _crud_metadata[f"list_{model_name}"] = metadata

    CRUDRegistry().register(model, CRUDEntry(path=path, config=config))

    return controller_cls
