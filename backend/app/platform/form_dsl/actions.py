from __future__ import annotations

from enum import StrEnum, auto

import msgspec
import sqlalchemy as sa
from litestar.exceptions import NotFoundException, ValidationException
from sqlalchemy.ext.asyncio import AsyncSession

from app.platform.actions.base import (
    BaseObjectAction,
    BaseTopLevelAction,
    EmptyActionData,
    action_group_factory,
)
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.form_dsl.schema import FieldDef, FieldType
from app.platform.form_dsl.schemas import (
    AddAdHocFieldData,
    AddAdHocSectionData,
    UpdateNodeValueData,
)
from app.platform.form_dsl.validate import validate_field_value


class FormNodeActionKey(StrEnum):
    UPDATE_VALUE = auto()
    ADD_REPEATER_INSTANCE = auto()
    ADD_AD_HOC_FIELD = auto()
    ADD_AD_HOC_SECTION = auto()
    DELETE = auto()


form_node_actions = action_group_factory(
    group_type=ActionGroupType.FORM_NODE_ACTIONS,
    model_type=FormNode,
)


def invalidate_owner(node: FormNode) -> list[str]:
    return [f"/{node.owner_type}/{node.owner_id}"] if node.owner_type else []


async def next_sort_order(transaction: AsyncSession, parent_id: int | None, owner_type: str, owner_id: int) -> int:
    stmt = sa.select(sa.func.coalesce(sa.func.max(FormNode.sort_order), -1)).where(
        FormNode.owner_type == owner_type,
        FormNode.owner_id == owner_id,
        FormNode.parent_id.is_(parent_id) if parent_id is None else FormNode.parent_id == parent_id,
    )
    result = await transaction.scalar(stmt)
    return int(result or 0) + 1


@form_node_actions
class UpdateNodeValue(BaseObjectAction[FormNode, UpdateNodeValueData]):
    action_key = FormNodeActionKey.UPDATE_VALUE
    label = "Save"
    icon = ActionIcon.CHECK
    is_hidden = True

    @classmethod
    async def execute(
        cls, obj: FormNode, data: UpdateNodeValueData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if obj.kind != FormNodeKind.field:
            raise ValidationException(f"Only field nodes accept value updates (got {obj.kind.value})")

        obj.value = validate_field_value(obj.config, data.value)

        return ActionExecutionResponse(message="Saved", invalidate_queries=invalidate_owner(obj))


@form_node_actions
class AddRepeaterInstance(BaseObjectAction[FormNode, EmptyActionData]):
    action_key = FormNodeActionKey.ADD_REPEATER_INSTANCE
    label = "Add another"
    icon = ActionIcon.ADD

    @classmethod
    async def execute(
        cls, obj: FormNode, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        if obj.kind != FormNodeKind.field or not obj.config or obj.config.get("type") != FieldType.REPEATER.value:
            raise ValidationException("Target is not a repeater field")

        field = msgspec.convert(obj.config, FieldDef)
        # Find existing instances to determine sort_order.
        existing = await transaction.scalar(
            sa.select(sa.func.count(FormNode.id)).where(
                FormNode.parent_id == obj.id, FormNode.kind == FormNodeKind.repeater_instance
            )
        )
        instance_index = int(existing or 0)

        instance = FormNode(
            organization_id=obj.organization_id,
            owner_type=obj.owner_type,
            owner_id=obj.owner_id,
            parent_id=obj.id,
            kind=FormNodeKind.repeater_instance,
            schema_ref=None,
            label=f"{field.label} #{instance_index + 1}",
            sort_order=instance_index,
        )
        transaction.add(instance)
        await transaction.flush()

        for child_index, child in enumerate(field.fields):
            transaction.add(
                FormNode(
                    organization_id=obj.organization_id,
                    owner_type=obj.owner_type,
                    owner_id=obj.owner_id,
                    parent_id=instance.id,
                    kind=FormNodeKind.field,
                    schema_ref=child.id,
                    label=child.label,
                    value=None,
                    config=msgspec.to_builtins(child),
                    sort_order=child_index,
                )
            )

        return ActionExecutionResponse(
            message="Instance added", created_id=instance.id, invalidate_queries=invalidate_owner(obj)
        )


@form_node_actions
class AddAdHocField(BaseTopLevelAction[AddAdHocFieldData]):
    action_key = FormNodeActionKey.ADD_AD_HOC_FIELD
    label = "Add field"
    icon = ActionIcon.ADD
    is_hidden = True

    @classmethod
    async def execute(
        cls, data: AddAdHocFieldData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        parent = await transaction.get(FormNode, data.parent_id)
        if parent is None:
            raise NotFoundException("Parent node not found")
        if parent.kind not in (FormNodeKind.section, FormNodeKind.subsection, FormNodeKind.repeater_instance):
            raise ValidationException("Ad-hoc fields can only be added to sections or subsections")

        field = FieldDef(
            id=f"ad_hoc_{data.label.lower().replace(' ', '_')}",
            label=data.label,
            type=data.type,
            required=data.required,
            config={"options": data.options} if data.options else {},
        )
        sort_order = await next_sort_order(transaction, parent.id, parent.owner_type, parent.owner_id)
        node = FormNode(
            organization_id=parent.organization_id,
            owner_type=parent.owner_type,
            owner_id=parent.owner_id,
            parent_id=parent.id,
            kind=FormNodeKind.field,
            schema_ref=None,
            label=field.label,
            value=None,
            config=msgspec.to_builtins(field),
            sort_order=sort_order,
        )
        transaction.add(node)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Field added", created_id=node.id, invalidate_queries=invalidate_owner(parent)
        )


@form_node_actions
class AddAdHocSection(BaseTopLevelAction[AddAdHocSectionData]):
    action_key = FormNodeActionKey.ADD_AD_HOC_SECTION
    label = "Add section"
    icon = ActionIcon.ADD
    is_hidden = True

    @classmethod
    async def execute(
        cls, data: AddAdHocSectionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        sort_order = await next_sort_order(transaction, None, data.owner_type, data.owner_id)
        node = FormNode(
            organization_id=deps.user.organization_id,
            owner_type=data.owner_type,
            owner_id=data.owner_id,
            parent_id=None,
            kind=FormNodeKind.section,
            schema_ref=None,
            label=data.title,
            sort_order=sort_order,
        )
        transaction.add(node)
        await transaction.flush()
        return ActionExecutionResponse(
            message="Section added",
            created_id=node.id,
            invalidate_queries=[f"/{data.owner_type}/{data.owner_id}"],
        )


@form_node_actions
class DeleteNode(BaseObjectAction[FormNode, EmptyActionData]):
    action_key = FormNodeActionKey.DELETE
    label = "Delete"
    icon = ActionIcon.TRASH
    confirmation_message = "Delete this node? Attached photos will return to Unassigned."

    @classmethod
    async def execute(
        cls, obj: FormNode, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        # Soft-delete via the BaseDBModel helper. The session-level listener
        # in app/domain/surveys/listeners.py detaches survey_media node_ids.
        obj.soft_delete()
        return ActionExecutionResponse(message="Deleted", invalidate_queries=invalidate_owner(obj))
