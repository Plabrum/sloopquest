from litestar import Router, get

from app.platform.actions.schemas import _action_metadata
from app.platform.auth.guards import requires_local
from app.platform.base.crud import _crud_metadata


@get("/crud-metadata", tags=["schema"])
async def crud_metadata() -> dict:
    """Column metadata for frontend codegen (filterable/sortable columns per CRUD resource)."""
    return _crud_metadata


@get("/action-metadata", tags=["schema"])
async def action_metadata() -> dict:
    """Action form metadata for frontend codegen (field types, labels, ordering per action)."""
    return _action_metadata


schema_router = Router(
    path="/schema",
    route_handlers=[crud_metadata, action_metadata],
    tags=["schema"],
    guards=[requires_local],
)
