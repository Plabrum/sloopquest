import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { PageTopBar } from "@/components/layout/page-topbar";
import { KeyValueGrid } from "@/components/layout/key-value-grid";
import { ActionsMenu } from "@/components/actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useVesselsIdDetailHandlerSuspense } from "@/openapi/vessel/vessel";
import { useActionsActionGroupObjectIdListObjectActions } from "@/openapi/actions/actions";

function VesselDetailContent() {
  const { vesselId } = useParams({ from: "/_authenticated/vessels/$vesselId" });
  const { data } = useVesselsIdDetailHandlerSuspense(vesselId);
  const { data: actionsData, refetch: refetchActions } =
    useActionsActionGroupObjectIdListObjectActions("vessel_actions", vesselId);

  return (
    <PageTopBar
      title={data.name}
      actions={
        <ActionsMenu
          actions={actionsData?.actions ?? []}
          actionGroup="vessel_actions"
          objectId={vesselId}
          objectData={data}
          onActionComplete={() => refetchActions()}
        />
      }
    >
      <div className="p-6">
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
