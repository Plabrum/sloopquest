import { Paperclip } from "lucide-react";

import type { AttachmentRef } from "@/openapi/litestarAPI.schemas";

interface Props {
  attachments: AttachmentRef[];
}

export function AttachmentsList({ attachments }: Props) {
  if (attachments.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {attachments.map((a, i) => (
        <li
          key={`${a.s3_key ?? a.filename}-${i}`}
          className="inline-flex items-center gap-2 rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
        >
          <Paperclip className="size-3" />
          <span className="font-medium text-foreground">{a.filename || "(unnamed)"}</span>
          {typeof a.size === "number" && (
            <span className="text-muted-foreground/70">{formatBytes(a.size)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
