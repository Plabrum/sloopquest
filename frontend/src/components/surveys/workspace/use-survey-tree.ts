import { useMemo } from "react";
import type { FormNodeRef, SectionCompletion } from "@/openapi/litestarAPI.schemas";
import { isFinding, type Tree } from "./node-helpers";

function buildTree(nodes: FormNodeRef[]): Tree[] {
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
  findings: FormNodeRef[];
  findingsByParent: Map<string, FormNodeRef[]>;
  sectionAncestor: Map<string, string>;
};

export function useSurveyTree(
  nodes: FormNodeRef[],
  sectionCompletion: SectionCompletion[],
): SurveyTree {
  return useMemo(() => {
    const tree = buildTree(nodes);
    const sections = tree.filter((n) => n.kind === "section");
    const completion = new Map(sectionCompletion.map((c) => [c.section_id, c]));

    const findings = nodes.filter(isFinding);
    const findingsByParent = new Map<string, FormNodeRef[]>();
    for (const f of findings) {
      if (!f.parent_id) continue;
      const list = findingsByParent.get(f.parent_id) ?? [];
      list.push(f);
      findingsByParent.set(f.parent_id, list);
    }

    // Build section-ancestor map in O(n) using a node lookup
    const byId = new Map<string, FormNodeRef>();
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
