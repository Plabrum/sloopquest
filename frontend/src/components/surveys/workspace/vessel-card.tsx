import { Link } from "@tanstack/react-router";
import type { SurveyDetail } from "@/openapi/litestarAPI.schemas";
import { RailSection } from "./rail-section";

export function VesselCard({ data }: { data: SurveyDetail }) {
  const rows: { k: string; v: string; href?: string }[] = [
    { k: "Vessel", v: data.vessel.label, href: data.vessel.href },
    { k: "Surveyor", v: data.surveyor.label, href: data.surveyor.href },
  ];

  return (
    <RailSection label="Vessel">
      <dl className="space-y-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{r.k}</dt>
            <dd className="min-w-0 truncate text-foreground">
              {r.href ? (
                <Link to={r.href} className="link-rule normal-case tracking-normal">
                  {r.v}
                </Link>
              ) : (
                r.v
              )}
            </dd>
          </div>
        ))}
      </dl>
    </RailSection>
  );
}
