from litestar import Router, get

from app.platform.actions.registry import ActionRegistry
from app.platform.actions.schemas import _action_metadata
from app.platform.auth.guards import requires_local
from app.platform.base.crud import CRUDRegistry, _crud_metadata
from app.platform.state_machine.models import get_state_machine_meta


@get("/crud-metadata", tags=["schema"])
async def crud_metadata() -> dict:
    """Column metadata for frontend codegen.

    Includes filterable/sortable columns per CRUD resource, plus a
    `state_machine: {column, states, action_group}` block for any resource
    whose model uses `StateMachineMixin`. State-machine awareness is asserted
    by the backend (not inferred from column names) so the codegen can drop
    its name-based heuristics.
    """
    out: dict[str, dict] = {k: dict(v) for k, v in _crud_metadata.items()}
    for model in CRUDRegistry().get_all_types():
        sm = get_state_machine_meta(model)
        if sm is None:
            continue
        group = ActionRegistry().find_by_model(model)
        if group is not None:
            sm["action_group"] = group.group_type.value
        key = f"list_{model.__name__}"
        if key in out:
            out[key]["state_machine"] = sm
    return out


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
