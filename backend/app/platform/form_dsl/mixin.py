"""Mixin for models that own a form-response node tree."""

from typing import TYPE_CHECKING, Any

from sqlalchemy import and_
from sqlalchemy.orm import Mapped, declared_attr, relationship

if TYPE_CHECKING:
    from app.platform.form_dsl.models import FormNode


class FormResponseMixin:
    """Polymorphic FormNode relationship for any owner that materializes a
    `TemplateDefinition`.

    Keyed by `(owner_type, owner_id)` where `owner_type` is the owner's table
    name. Nodes are created via `materialize_form_response` at owner-creation
    time and mutated thereafter through per-node actions.
    """

    @declared_attr
    @classmethod
    def form_nodes(cls: Any) -> Mapped[list["FormNode"]]:
        from app.platform.form_dsl.models import FormNode  # noqa: PLC0415

        tablename: str = cls.__tablename__

        return relationship(
            "FormNode",
            primaryjoin=lambda: and_(
                FormNode.owner_type == tablename,
                FormNode.owner_id == cls.id,
            ),
            foreign_keys="[FormNode.owner_id]",
            viewonly=True,
            lazy="noload",
        )
