import type { FormNodeRef } from "@/openapi/litestarAPI.schemas";

export type Tree = FormNodeRef & { children: Tree[] };

export const DRAG_MEDIA_TYPE = "application/x-sloopquest-media-id";

export function getFieldType(node: FormNodeRef): string | undefined {
  return (node.config as { type?: string } | null)?.type;
}

export type FindingValue = { severity?: string; summary?: string; type?: string };

export function getFindingValue(node: FormNodeRef): FindingValue | null {
  return node.value as FindingValue | null;
}

export function isFinding(node: FormNodeRef): boolean {
  return node.kind === "annotation" && getFindingValue(node)?.type === "finding";
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
