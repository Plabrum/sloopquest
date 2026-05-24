"""Marine pre-purchase survey template definition for the dev fixtures.

Exercises every workspace flow: metadata fields that gate conditional
sections, a mix of field types (text, longtext, select, segmented, number,
photo, repeater), a conditional section keyed off `sea_trial`, and a
repeater on the Electrical section so M7 has a target.
"""

from __future__ import annotations

from app.platform.form_dsl.schema import (
    FieldCondition,
    FieldDef,
    FieldType,
    Section,
    Subsection,
    TemplateDefinition,
)


def marine_template() -> TemplateDefinition:
    return TemplateDefinition(
        version=1,
        sections=[
            Section(
                id="survey_info",
                title="Survey info",
                fields=[
                    FieldDef(
                        id="survey_type",
                        label="Survey type",
                        type=FieldType.SEGMENTED,
                        required=True,
                        allow_finding=False,
                        config={"options": ["pre_purchase", "insurance", "appraisal"]},
                    ),
                    FieldDef(
                        id="overall_rating",
                        label="Overall rating",
                        type=FieldType.SELECT,
                        allow_finding=False,
                        config={"options": ["above_average", "average", "below_average"]},
                    ),
                    FieldDef(
                        id="market_value",
                        label="Market value (USD)",
                        type=FieldType.CURRENCY,
                        allow_finding=False,
                    ),
                    FieldDef(
                        id="in_water",
                        label="Surveyed in water",
                        type=FieldType.BOOLEAN,
                        allow_finding=False,
                    ),
                    FieldDef(
                        id="sea_trial",
                        label="Sea trial performed",
                        type=FieldType.BOOLEAN,
                        allow_finding=False,
                    ),
                ],
            ),
            Section(
                id="hull_bottom",
                title="Hull & Bottom",
                subsections=[
                    Subsection(
                        id="hull_general",
                        title="General condition",
                        fields=[
                            FieldDef(
                                id="hull_material_notes",
                                label="Hull material observations",
                                type=FieldType.LONGTEXT,
                            ),
                            FieldDef(
                                id="moisture_reading",
                                label="Moisture meter reading (%)",
                                type=FieldType.NUMBER,
                            ),
                            FieldDef(
                                id="blistering",
                                label="Blistering",
                                type=FieldType.SEGMENTED,
                                config={"options": ["none", "minor", "moderate", "severe"]},
                            ),
                            FieldDef(
                                id="hull_photos",
                                label="Hull photos",
                                type=FieldType.PHOTO,
                            ),
                        ],
                    ),
                ],
            ),
            Section(
                id="engine",
                title="Engine",
                subsections=[
                    Subsection(
                        id="engine_main",
                        title="Main engine",
                        fields=[
                            FieldDef(
                                id="engine_make_model",
                                label="Make / model",
                                type=FieldType.TEXT,
                            ),
                            FieldDef(
                                id="engine_hours",
                                label="Engine hours",
                                type=FieldType.NUMBER,
                            ),
                            FieldDef(
                                id="oil_condition",
                                label="Oil condition",
                                type=FieldType.SELECT,
                                config={"options": ["clean", "darkening", "needs_change"]},
                            ),
                            FieldDef(
                                id="engine_notes",
                                label="Engine notes",
                                type=FieldType.LONGTEXT,
                            ),
                            FieldDef(
                                id="engine_photos",
                                label="Engine bay photos",
                                type=FieldType.PHOTO,
                            ),
                        ],
                    ),
                ],
            ),
            Section(
                id="electrical",
                title="Electrical",
                subsections=[
                    Subsection(
                        id="electrical_dc",
                        title="DC system",
                        fields=[
                            FieldDef(
                                id="house_bank_voltage",
                                label="House bank resting voltage (V)",
                                type=FieldType.NUMBER,
                            ),
                            FieldDef(
                                id="battery_bank",
                                label="Battery banks",
                                type=FieldType.REPEATER,
                                instance_label_field="bank_label",
                                fields=[
                                    FieldDef(
                                        id="bank_label",
                                        label="Bank label",
                                        type=FieldType.TEXT,
                                    ),
                                    FieldDef(
                                        id="bank_capacity_ah",
                                        label="Capacity (Ah)",
                                        type=FieldType.NUMBER,
                                    ),
                                    FieldDef(
                                        id="bank_age_years",
                                        label="Age (years)",
                                        type=FieldType.NUMBER,
                                    ),
                                ],
                            ),
                            FieldDef(
                                id="electrical_notes",
                                label="Notes",
                                type=FieldType.LONGTEXT,
                            ),
                        ],
                    ),
                ],
            ),
            Section(
                id="sea_trial",
                title="Sea Trial",
                condition=FieldCondition(field="sea_trial", equals=True),
                subsections=[
                    Subsection(
                        id="sea_trial_performance",
                        title="Performance",
                        fields=[
                            FieldDef(
                                id="cruising_rpm",
                                label="Cruising RPM",
                                type=FieldType.NUMBER,
                            ),
                            FieldDef(
                                id="cruising_speed_kts",
                                label="Cruising speed (kts)",
                                type=FieldType.NUMBER,
                            ),
                            FieldDef(
                                id="handling_notes",
                                label="Handling notes",
                                type=FieldType.LONGTEXT,
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )
