import { useMemo } from "react";
import type { SurveyDetail, SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";

export type SurveyMediaState = {
  items: SurveyMediaListItem[];
  unassigned: SurveyMediaListItem[];
  byNode: Map<string, SurveyMediaListItem[]>;
  forSection: (sectionId: string | null, sectionAncestor: Map<string, string>) => SurveyMediaListItem[];
};

export function useSurveyMedia(data: SurveyDetail): SurveyMediaState {
  return useMemo(() => {
    const unassigned = data.unassigned_media;
    const byNode = new Map<string, SurveyMediaListItem[]>();
    const assigned: SurveyMediaListItem[] = [];
    for (const n of data.form_nodes) {
      if (n.attached_media?.length) {
        byNode.set(n.id, n.attached_media);
        assigned.push(...n.attached_media);
      }
    }
    const items = [...unassigned, ...assigned];
    const forSection = (
      sectionId: string | null,
      sectionAncestor: Map<string, string>,
    ): SurveyMediaListItem[] => {
      if (!sectionId) return assigned;
      return assigned.filter((m) => m.node_id && sectionAncestor.get(m.node_id) === sectionId);
    };
    return { items, unassigned, byNode, forSection };
  }, [data]);
}
