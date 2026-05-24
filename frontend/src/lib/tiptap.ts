export type TiptapContent = Record<string, unknown>;

interface TiptapNode {
  type?: string;
  content?: Array<{ text?: string }>;
}

interface TiptapContentShape {
  type?: string;
  content?: TiptapNode[];
}

export function hasContentText(content: TiptapContent | null | undefined): boolean {
  if (!content || typeof content !== "object") return false;
  const shaped = content as TiptapContentShape;
  return (
    Array.isArray(shaped.content) &&
    shaped.content.some(
      (node) =>
        Array.isArray(node.content) &&
        node.content.some((child) => child.text && child.text.trim()),
    )
  );
}
