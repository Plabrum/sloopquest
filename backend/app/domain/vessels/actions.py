from __future__ import annotations

from enum import StrEnum, auto

from litestar.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.vessels.models import Engine, Vessel
from app.domain.vessels.schemas import (
    AddEngineData,
    RemoveEngineData,
    UpdateEngineData,
    VesselCreateData,
    VesselUpdateData,
)
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class VesselActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    ADD_ENGINE = auto()
    UPDATE_ENGINE = auto()
    REMOVE_ENGINE = auto()


vessel_actions = action_group_factory(
    group_type=ActionGroupType.VESSEL_ACTIONS,
    default_invalidation="/vessels",
    model_type=Vessel,
)


@vessel_actions
class CreateVessel(BaseTopLevelAction[VesselCreateData]):
    action_key = VesselActionKey.CREATE
    label = "Add Vessel"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: VesselCreateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        vessel = Vessel(
            organization_id=deps.user.organization_id,
            name=data.name,
            hin=data.hin,
            uscg_official_number=data.uscg_official_number,
            state_registration_number=data.state_registration_number,
            manufacturer_id=data.manufacturer_id,
            model=data.model,
            year_built=data.year_built,
            vessel_type=data.vessel_type,
            propulsion_type=data.propulsion_type,
            rigging_type=data.rigging_type,
            loa_ft=data.loa_ft,
            beam_ft=data.beam_ft,
            draft_ft=data.draft_ft,
            displacement_lbs=data.displacement_lbs,
            fuel_capacity_gal=data.fuel_capacity_gal,
            hull_material=data.hull_material,
            construction_notes=data.construction_notes,
        )
        transaction.add(vessel)
        await transaction.flush()
        return ActionExecutionResponse(message="Vessel created", created_id=vessel.id)


@vessel_actions
class UpdateVessel(BaseObjectAction[Vessel, VesselUpdateData]):
    action_key = VesselActionKey.UPDATE
    label = "Edit Vessel"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Vessel, data: VesselUpdateData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.name = data.name
        obj.hin = data.hin
        obj.uscg_official_number = data.uscg_official_number
        obj.state_registration_number = data.state_registration_number
        obj.manufacturer_id = data.manufacturer_id
        obj.model = data.model
        obj.year_built = data.year_built
        obj.vessel_type = data.vessel_type
        obj.propulsion_type = data.propulsion_type
        obj.rigging_type = data.rigging_type
        obj.loa_ft = data.loa_ft
        obj.beam_ft = data.beam_ft
        obj.draft_ft = data.draft_ft
        obj.displacement_lbs = data.displacement_lbs
        obj.fuel_capacity_gal = data.fuel_capacity_gal
        obj.hull_material = data.hull_material
        obj.construction_notes = data.construction_notes
        return ActionExecutionResponse(message="Vessel updated")


@vessel_actions
class DeleteVessel(BaseObjectAction[Vessel, EmptyActionData]):
    action_key = VesselActionKey.DELETE
    label = "Delete Vessel"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this vessel?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: Vessel, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Vessel deleted")


@vessel_actions
class AddEngine(BaseObjectAction[Vessel, AddEngineData]):
    action_key = VesselActionKey.ADD_ENGINE
    label = "Add Engine"
    icon = ActionIcon.ADD
    priority = 30

    @classmethod
    async def execute(
        cls, obj: Vessel, data: AddEngineData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        engine = Engine(
            vessel_id=obj.id,
            position=data.position,
            manufacturer_id=data.manufacturer_id,
            model=data.model,
            serial_number=data.serial_number,
            year=data.year,
            horsepower=data.horsepower,
            fuel_type=data.fuel_type,
            engine_type=data.engine_type,
            hours_at_survey=data.hours_at_survey,
        )
        transaction.add(engine)
        await transaction.flush()
        return ActionExecutionResponse(message="Engine added", created_id=engine.id)


@vessel_actions
class UpdateEngine(BaseObjectAction[Vessel, UpdateEngineData]):
    action_key = VesselActionKey.UPDATE_ENGINE
    label = "Edit Engine"
    icon = ActionIcon.EDIT
    priority = 40
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: Vessel, data: UpdateEngineData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(Engine).where(Engine.id == data.engine_id, Engine.vessel_id == obj.id)
        )
        engine = result.scalar_one_or_none()
        if engine is None:
            raise NotFoundException()
        engine.position = data.position
        engine.manufacturer_id = data.manufacturer_id
        engine.model = data.model
        engine.serial_number = data.serial_number
        engine.year = data.year
        engine.horsepower = data.horsepower
        engine.fuel_type = data.fuel_type
        engine.engine_type = data.engine_type
        engine.hours_at_survey = data.hours_at_survey
        return ActionExecutionResponse(message="Engine updated")


@vessel_actions
class RemoveEngine(BaseObjectAction[Vessel, RemoveEngineData]):
    action_key = VesselActionKey.REMOVE_ENGINE
    label = "Remove Engine"
    icon = ActionIcon.TRASH
    priority = 50
    is_hidden = True
    confirmation_message = "Remove this engine?"

    @classmethod
    async def execute(
        cls, obj: Vessel, data: RemoveEngineData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        result = await transaction.execute(
            select(Engine).where(Engine.id == data.engine_id, Engine.vessel_id == obj.id)
        )
        engine = result.scalar_one_or_none()
        if engine is None:
            raise NotFoundException()
        await transaction.delete(engine)
        return ActionExecutionResponse(message="Engine removed")
