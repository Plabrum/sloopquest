"""Block-based export builder.

Reads a survey's `form_nodes` + `survey_media` and produces an ordered list of
typed block dicts that the report exporter (PDF / HTML) renders against. The
schema lives close to the renderer rather than in the database — the builder
shape is the contract.

Block shapes:
    {"type": "section",    "id", "label"}
    {"type": "subsection", "id", "label"}
    {"type": "field",      "id", "label", "field_type", "value", "photos"}
    {"type": "repeater_instance", "id", "label"}
    {"type": "finding",    "id", "severity", "summary", "detail",
                            "recommended_action", "originating_value_snapshot",
                            "photos"}

`photos` entries are `{id, media_id, file_key, thumbnail_key, caption}` — the
renderer signs URLs at delivery time so the persisted JSON stays portable.
"""

from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.surveys.models import Survey, SurveyMedia
from app.platform.form_dsl.conditions import resolve_visibility
from app.platform.form_dsl.enums import FormNodeKind
from app.platform.form_dsl.models import FormNode
from app.platform.media.models import Media
from app.utils.sqids import sqid_encode


async def build_report_blocks(transaction: AsyncSession, survey: Survey) -> list[dict[str, Any]]:
    nodes_stmt = (
        sa.select(FormNode)
        .where(
            FormNode.owner_type == Survey.__tablename__,
            FormNode.owner_id == survey.id,
            FormNode.deleted_at.is_(None),
        )
        .order_by(FormNode.parent_id.nulls_first(), FormNode.sort_order)
    )
    nodes = list((await transaction.execute(nodes_stmt)).scalars())

    media_stmt = (
        sa.select(SurveyMedia, Media)
        .join(Media, Media.id == SurveyMedia.media_id)
        .where(SurveyMedia.survey_id == survey.id, SurveyMedia.node_id.is_not(None))
    )
    media_rows = list((await transaction.execute(media_stmt)).all())
    photos_by_node: dict[int, list[dict[str, Any]]] = {}
    for sm, media in media_rows:
        if sm.node_id is None:
            continue
        photos_by_node.setdefault(sm.node_id, []).append(
            {
                "id": sqid_encode(sm.id),
                "media_id": sqid_encode(media.id),
                "file_key": media.file_key,
                "thumbnail_key": media.thumbnail_key,
                "caption": sm.caption,
            }
        )

    visibility = resolve_visibility(nodes)

    nodes_by_id = {n.id: n for n in nodes}
    children: dict[int | None, list[FormNode]] = {}
    for n in nodes:
        children.setdefault(n.parent_id, []).append(n)
    for siblings in children.values():
        siblings.sort(key=lambda n: n.sort_order)

    def encode_id(n: FormNode) -> str:
        return sqid_encode(n.id)

    blocks: list[dict[str, Any]] = []

    def emit(n: FormNode) -> None:
        if visibility.get(n.id) is False:
            return
        photos = photos_by_node.get(n.id, [])

        if n.kind == FormNodeKind.section:
            blocks.append({"type": "section", "id": encode_id(n), "label": n.label})
            for child in children.get(n.id, []):
                emit(child)
        elif n.kind == FormNodeKind.subsection:
            blocks.append({"type": "subsection", "id": encode_id(n), "label": n.label})
            for child in children.get(n.id, []):
                emit(child)
        elif n.kind == FormNodeKind.field:
            field_type = None
            if isinstance(n.config, dict):
                field_type = n.config.get("type")
            blocks.append(
                {
                    "type": "field",
                    "id": encode_id(n),
                    "label": n.label,
                    "field_type": field_type,
                    "value": n.value,
                    "photos": photos,
                }
            )
            for child in children.get(n.id, []):
                emit(child)
        elif n.kind == FormNodeKind.repeater_instance:
            blocks.append({"type": "repeater_instance", "id": encode_id(n), "label": n.label})
            for child in children.get(n.id, []):
                emit(child)
        elif n.kind == FormNodeKind.annotation:
            val = n.value if isinstance(n.value, dict) else {}
            if val.get("type") == "finding":
                blocks.append(
                    {
                        "type": "finding",
                        "id": encode_id(n),
                        "severity": val.get("severity"),
                        "summary": val.get("summary"),
                        "detail": val.get("detail"),
                        "recommended_action": val.get("recommended_action"),
                        "originating_value_snapshot": val.get("originating_value_snapshot"),
                        "photos": photos,
                    }
                )

    for root in children.get(None, []):
        emit(root)

    # Findings parented to fields would otherwise nest under the field; we want
    # them surfaced as their own blocks too, but only once. The emit() above
    # already covers that because it walks children.
    # Surface unparented findings (annotations that didn't render via parent
    # walk because their parent was hidden) at the end so they don't disappear
    # from the report silently.
    emitted_ids = {b["id"] for b in blocks}
    for n in nodes:
        if (
            n.kind == FormNodeKind.annotation
            and isinstance(n.value, dict)
            and n.value.get("type") == "finding"
            and encode_id(n) not in emitted_ids
        ):
            val = n.value
            blocks.append(
                {
                    "type": "finding",
                    "id": encode_id(n),
                    "severity": val.get("severity"),
                    "summary": val.get("summary"),
                    "detail": val.get("detail"),
                    "recommended_action": val.get("recommended_action"),
                    "originating_value_snapshot": val.get("originating_value_snapshot"),
                    "photos": photos_by_node.get(n.id, []),
                }
            )

    _ = nodes_by_id  # keep reference for future cross-refs (e.g. linking finding → field label)
    return blocks
