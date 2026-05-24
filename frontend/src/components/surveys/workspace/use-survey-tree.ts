import { useMemo } from "react";
import type { SurveyFormNodeRef, SectionCompletion } from "@/openapi/litestarAPI.schemas";
import { type Tree } from "./field";

function buildTree(nodes: SurveyFormNodeRef[]): Tree[] {
  const byId = new Map<string, Tree>();
  for (const n of nodes) byId.set(n.id, { ...n, children: [] });
  const roots: Tree[] = [];
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  const sortRec = (t: Tree) => {
    t.children.sort((a, b) => a.sort_order - b.sort_order);
    t.children.forEach(sortRec);
  };
  roots.sort((a, b) => a.sort_order - b.sort_order);
  roots.forEach(sortRec);
  return roots;
}

export type SurveyTree = {
  tree: Tree[];
  sections: Tree[];
  completion: Map<string, SectionCompletion>;
  findings: SurveyFormNodeRef[];
  findingsByParent: Map<string, SurveyFormNodeRef[]>;
  sectionAncestor: Map<string, string>;
};

export function useSurveyTree(
  nodes: SurveyFormNodeRef[],
  sectionCompletion: SectionCompletion[],
): SurveyTree {
  return useMemo(() => {
    const tree = buildTree(nodes);
    const sections = tree.filter((n) => n.kind === "section");
    const completion = new Map(sectionCompletion.map((c) => [c.section_id, c]));

    const findings: SurveyFormNodeRef[] = [];
    const findingsByParent = new Map<string, SurveyFormNodeRef[]>();
    for (const n of nodes) {
      if (!n.findings?.length) continue;
      findingsByParent.set(n.id, n.findings);
      findings.push(...n.findings);
    }

    // Build section-ancestor map in O(n) using a node lookup
    const byId = new Map<string, SurveyFormNodeRef>();
    for (const n of nodes) byId.set(n.id, n);
    const sectionAncestor = new Map<string, string>();
    const findSectionId = (startId: string): string | undefined => {
      let cur: string | null = startId;
      while (cur) {
        const cached = sectionAncestor.get(cur);
        if (cached) return cached;
        const node = byId.get(cur);
        if (!node) return undefined;
        if (node.kind === "section") return node.id;
        cur = node.parent_id ?? null;
      }
      return undefined;
    };
    for (const n of nodes) {
      const sid = findSectionId(n.id);
      if (sid) sectionAncestor.set(n.id, sid);
    }

    return { tree, sections, completion, findings, findingsByParent, sectionAncestor };
  }, [nodes, sectionCompletion]);
}
