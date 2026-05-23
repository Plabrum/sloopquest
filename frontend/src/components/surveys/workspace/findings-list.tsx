import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jumpToHash } from "@/lib/scroll";
import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";
import { getFindingValue } from "./node-helpers";
import { SEVERITY_DOT, SEVERITY_RANK, SEVERITY_TEXT, asSeverity } from "./severity";

export function FindingsList({
  findings,
  sectionAncestor,
}: {
  findings: FormNodeRef[];
  sectionAncestor: Map<string, string>;
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
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Findings ({findings.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        {findings.length === 0 && (
          <p className="text-xs text-muted-foreground">None yet.</p>
        )}
        <ul className="space-y-1">
          {sorted.map((f) => {
            const v = getFindingValue(f);
            const sev = asSeverity(v?.severity);
            const sectionId = f.parent_id ? sectionAncestor.get(f.parent_id) ?? f.parent_id : null;
            return (
              <li key={f.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start gap-1 px-1 py-0.5 text-xs font-normal"
                  onClick={() => sectionId && jumpToHash(`section-${sectionId}`)}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[sev]}`} />
                  <span className={SEVERITY_TEXT[sev]}>{v?.summary ?? f.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
