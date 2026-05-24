import { useMemo } from "react";
import type { SurveyFormNodeRef } from "@/openapi/litestarAPI.schemas";
import { SEVERITY_RANK, asSeverity, getFindingValue, type Severity } from "./field";
import { RailSection } from "./rail-section";

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "bg-red-500 border-red-500",
  advisory: "bg-amber-500 border-amber-500",
  info: "bg-sky-500 border-sky-500",
};

export function FindingsList({
  findings,
  sectionAncestor,
  goToSection,
}: {
  findings: SurveyFormNodeRef[];
  sectionAncestor: Map<string, string>;
  goToSection: (sectionId: string) => void;
}) {
  const sorted = useMemo(
    () =>
      [...findings].sort((a, b) => {
        const av = asSeverity(getFindingValue(a)?.severity);
        const bv = asSeverity(getFindingValue(b)?.severity);
        return SEVERITY_RANK[av] - SEVERITY_RANK[bv];
      }),
    [findings],
  );

  return (
    <RailSection label="Findings" meta={`(${findings.length})`}>
      {findings.length === 0 ? (
        <p className="font-serif text-[12px] italic text-muted-foreground">None yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((f) => {
            const v = getFindingValue(f);
            const sev = asSeverity(v?.severity);
            const sectionId = f.parent_id
              ? sectionAncestor.get(f.parent_id) ?? f.parent_id
              : null;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => sectionId && goToSection(sectionId)}
                  className="group flex w-full items-start gap-2 text-left"
                >
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full border ${SEVERITY_TONE[sev]}`}
                  />
                  <span className="font-serif text-[13px] leading-[1.4] text-muted-foreground group-hover:text-foreground">
                    {v?.summary ?? f.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </RailSection>
  );
}
