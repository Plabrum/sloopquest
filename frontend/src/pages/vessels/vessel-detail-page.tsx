import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ChildObjectList, ChildObjectRow } from "@/components/layout";
import { ObjectActions } from "@/components/object-detail/object-actions";
import { TopLevelActions } from "@/components/object-list/top-level-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useChildObjectList } from "@/hooks/use-child-object-list";
import { useVesselsIdDetailHandlerSuspense } from "@/openapi/vessel/vessel";
import { useListEngine } from "@/openapi/engine/engine";
import type { EngineListItem } from "@/openapi/litestarAPI.schemas";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function VesselDetailContent() {
  const { vesselId } = useParams({ from: "/_authenticated/vessels/$vesselId" });
  const { data } = useVesselsIdDetailHandlerSuspense(vesselId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("vessel_actions", vesselId);

  const { items: engines } = useChildObjectList<EngineListItem>({
    listQuery: useListEngine,
    filters: [{ type: "text", column: "vessel_id", operation: "equals", value: vesselId }],
    defaultSorts: [{ column: "created_at", direction: "asc" }],
  });

  return (
    <PageTopBar
      title={data.name}
      actions={
        <ObjectActions
          data={{ ...data, actions: actionsData?.actions ?? [] }}
          actionGroup="vessel_actions"
          onRefetch={() => refetchActions()}
        />
      }
    >
      <div className="p-6 space-y-8">
        <KeyValueGrid
          items={[
            { label: "Name", value: data.name },
            { label: "Vessel Type", value: data.vessel_type ?? "—" },
            { label: "Propulsion Type", value: data.propulsion_type ?? "—" },
            { label: "Rigging Type", value: data.rigging_type ?? "—" },
            { label: "Hull Material", value: data.hull_material ?? "—" },
            { label: "Year Built", value: data.year_built ?? "—" },
            { label: "Model", value: data.model ?? "—" },
            { label: "LOA (ft)", value: data.loa_ft ?? "—" },
            { label: "Beam (ft)", value: data.beam_ft ?? "—" },
            { label: "Draft (ft)", value: data.draft_ft ?? "—" },
            { label: "Displacement (lbs)", value: data.displacement_lbs ?? "—" },
            { label: "Fuel Capacity (gal)", value: data.fuel_capacity_gal ?? "—" },
            { label: "HIN", value: data.hin ?? "—" },
            { label: "USCG Official #", value: data.uscg_official_number ?? "—" },
            { label: "State Reg #", value: data.state_registration_number ?? "—" },
          ]}
        />

        <ChildObjectList
          title="Engines"
          badge={engines.length || undefined}
          topLevelActions={
            <Suspense fallback={null}>
              <TopLevelActions
                actionGroup="engine_actions"
                formContext={{ vessel_id: vesselId }}
              />
            </Suspense>
          }
          items={engines}
          emptyMessage="No engines yet. Use Add Engine to create one."
          renderItem={(engine) => (
            <ChildObjectRow
              title={engine.model ?? engine.position}
              subtitle={[
                engine.position,
                engine.horsepower != null ? `${engine.horsepower} hp` : null,
                engine.year ?? null,
              ]
                .filter(Boolean)
                .join(" · ")}
              actions={<ObjectActions data={engine} actionGroup="engine_actions" />}
            />
          )}
        />
      </div>
    </PageTopBar>
  );
}

export function VesselDetailPage() {
  return (
    <Suspense
      fallback={
        <PageTopBar title="Vessel">
          <div className="p-6">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </PageTopBar>
      }
    >
      <VesselDetailContent />
    </Suspense>
  );
}
