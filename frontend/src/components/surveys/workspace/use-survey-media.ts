import { useMemo } from "react";
import { useListSurveyMedia } from "@/openapi/survey-media/survey-media";
import type { SurveyMediaListItem } from "@/openapi/litestarAPI.schemas";

export type SurveyMediaState = {
  items: SurveyMediaListItem[];
  unassigned: SurveyMediaListItem[];
  byNode: Map<string, SurveyMediaListItem[]>;
  forSection: (sectionId: string | null, sectionAncestor: Map<string, string>) => SurveyMediaListItem[];
};

export function useSurveyMedia(surveyId: string): SurveyMediaState {
  const { data: page } = useListSurveyMedia({
    filters: [{ type: "text", column: "survey_id", operation: "equals", value: surveyId }],
    limit: 100,
    offset: 0,
  });
  const items = page?.items ?? [];

  return useMemo(() => {
    const unassigned = items.filter((m) => !m.node_id);
    const byNode = new Map<string, SurveyMediaListItem[]>();
    for (const item of items) {
      if (!item.node_id) continue;
      const list = byNode.get(item.node_id) ?? [];
      list.push(item);
      byNode.set(item.node_id, list);
    }
    const forSection = (
      sectionId: string | null,
      sectionAncestor: Map<string, string>,
    ): SurveyMediaListItem[] => {
      if (!sectionId) return items.filter((m) => !!m.node_id);
      return items.filter((m) => m.node_id && sectionAncestor.get(m.node_id) === sectionId);
    };
    return { items, unassigned, byNode, forSection };
  }, [items]);
}
