import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurveyDetail } from "@/openapi/litestarAPI.schemas";

export function VesselCard({ data }: { data: SurveyDetail }) {
  return (
    <Card className="gap-1 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Vessel</CardTitle>
      </CardHeader>
      <CardContent className="px-3 text-sm">
        <Link to={data.vessel.href} className="text-primary hover:underline">
          {data.vessel.label}
        </Link>
      </CardContent>
    </Card>
  );
}
