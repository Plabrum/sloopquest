from litestar import Router, get

from app.auth.guards import requires_local
from app.base.crud import _crud_metadata


@get("/crud-metadata", tags=["schema"])
async def crud_metadata() -> dict:
    """Column metadata for frontend codegen (filterable/sortable columns per CRUD resource)."""
    return _crud_metadata


schema_router = Router(
    path="/schema",
    route_handlers=[crud_metadata],
    tags=["schema"],
    guards=[requires_local],
)
